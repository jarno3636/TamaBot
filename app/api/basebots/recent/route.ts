import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { zeroAddress } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ✅ Hard-coded Basebots contract (0x...222B4)
 */
const CONTRACT: `0x${string}` = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4";

/**
 * Minimal ABIs/events only
 */
const MINTED_EVENT = {
  type: "event",
  name: "Minted",
  inputs: [
    { indexed: true, name: "minter", type: "address" },
    { indexed: true, name: "fid", type: "uint256" },
  ],
} as const;

const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: true, name: "tokenId", type: "uint256" },
  ],
} as const;

const ERC721_TOKENURI_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

/**
 * Small in-memory cache (server instance)
 */
type Cached = { at: number; key: string; value: any };
let CACHE: Cached | null = null;
const CACHE_TTL_MS = 20_000;

function cacheGet(key: string) {
  if (!CACHE) return null;
  if (CACHE.key !== key) return null;
  if (Date.now() - CACHE.at > CACHE_TTL_MS) return null;
  return CACHE.value;
}
function cacheSet(key: string, value: any) {
  CACHE = { at: Date.now(), key, value };
}

/**
 * Do NOT leak RPC URLs in errors
 */
function safeErrMsg(e: any): string {
  const msg = e?.shortMessage || e?.message || String(e) || "Unknown error";
  // remove any accidental URLs from message
  return msg.replace(/https?:\/\/\S+/g, "[rpc]");
}

function safeB64ToUtf8(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri) return null;

  // data:application/json;base64,<...>
  if (tokenUri.startsWith("data:application/json;base64,")) {
    const b64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = safeB64ToUtf8(b64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      // image_data often contains raw SVG
      if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
        return meta.image_data;
      }

      // meta.image can be svg data urls
      if (typeof meta?.image === "string") {
        const img: string = meta.image;

        if (img.startsWith("data:image/svg+xml;base64,")) {
          const svgB64 = img.slice("data:image/svg+xml;base64,".length);
          const svg = safeB64ToUtf8(svgB64);
          return svg.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg.includes("<svg") ? svg : null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  return null;
}

function svgToDataUrl(svg: string) {
  // ensure xmlns exists
  let s = svg.includes('xmlns="http://www.w3.org/2000/svg"')
    ? svg
    : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

  // keep aspect safe
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  // data url
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

function getRpcList() {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const list = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : [
        // safe public fallbacks
        "https://mainnet.base.org",
        "https://base.publicnode.com",
      ];

  // de-dupe
  return Array.from(new Set(list));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Retry helper with small backoff
 */
async function retry<T>(fn: () => Promise<T>, tries = 2) {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(250 + i * 350);
    }
  }
  throw last;
}

/**
 * Scan logs in small windows backwards until we find N unique tokenIds
 * Tries Minted first (fast + direct fid), then Transfer(from=0) fallback.
 */
async function findRecentTokenIds(pc: ReturnType<typeof createPublicClient>, n: number, deployBlock: bigint) {
  const latest = await retry(() => pc.getBlockNumber(), 2);

  // Start with small window; if we don’t find enough, expand gradually.
  let window = 1_200n; // ~ small
  const maxWindow = 20_000n;
  const maxLoops = 18;

  const found: bigint[] = [];

  async function pushUnique(ids: bigint[]) {
    for (const id of ids) {
      if (!found.includes(id)) {
        found.push(id);
        if (found.length >= n) return;
      }
    }
  }

  // helper to sort newest-first logs
  function sortLogsNewestFirst(logs: any[]) {
    logs.sort((a, b) => {
      const ab = a.blockNumber ?? 0n;
      const bb = b.blockNumber ?? 0n;
      if (ab === bb) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
      return Number(bb - ab);
    });
  }

  for (let loop = 0; loop < maxLoops && found.length < n; loop++) {
    const toBlock = latest;
    const fromBlock = latest > window ? latest - window : 0n;
    const from = fromBlock < deployBlock ? deployBlock : fromBlock;

    // 1) Minted event (preferred)
    try {
      const logs = await retry(
        () =>
          pc.getLogs({
            address: CONTRACT,
            event: MINTED_EVENT,
            fromBlock: from,
            toBlock,
          }),
        2
      );

      sortLogsNewestFirst(logs);

      const ids: bigint[] = [];
      for (const l of logs) {
        const fid = (l.args as any)?.fid as bigint | undefined;
        if (fid !== undefined) ids.push(fid);
        if (ids.length >= n * 3) break; // cap
      }

      await pushUnique(ids);
      if (found.length >= n) break;
    } catch {
      // ignore and try fallback below
    }

    // 2) Fallback: Transfer(from=zeroAddress)
    try {
      const logs = await retry(
        () =>
          pc.getLogs({
            address: CONTRACT,
            event: TRANSFER_EVENT,
            args: { from: zeroAddress },
            fromBlock: from,
            toBlock,
          }),
        2
      );

      sortLogsNewestFirst(logs);

      const ids: bigint[] = [];
      for (const l of logs) {
        const tid = (l.args as any)?.tokenId as bigint | undefined;
        if (tid !== undefined) ids.push(tid);
        if (ids.length >= n * 3) break;
      }

      await pushUnique(ids);
      if (found.length >= n) break;
    } catch {
      // ignore
    }

    // Expand window gradually (adaptive)
    window = window < maxWindow ? window * 2n : maxWindow;
    await sleep(120); // tiny pause to reduce rate-limit bursts
  }

  return { latest, tokenIds: found.slice(0, n) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const deployBlock = BigInt(searchParams.get("deployBlock") || "0");

  const cacheKey = `n=${n}&deploy=${deployBlock.toString()}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "cache-control": "no-store" } });
  }

  const rpcs = getRpcList();
  if (!rpcs.length) {
    return NextResponse.json(
      { ok: false, error: "Base RPC temporarily unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  let lastErr: any = null;

  for (let i = 0; i < rpcs.length; i++) {
    const rpcUrl = rpcs[i];

    try {
      const pc = createPublicClient({
        chain: base,
        // IMPORTANT: do not leak URL anywhere in response
        transport: http(rpcUrl, {
          timeout: 22_000,
          batch: false,
        }),
      });

      const { latest, tokenIds } = await findRecentTokenIds(pc, n, deployBlock);

      if (tokenIds.length === 0) {
        const payload = {
          ok: true,
          contract: CONTRACT,
          latest: latest.toString(),
          cards: [] as Array<{ tokenId: string; image: string | null }>,
        };
        cacheSet(cacheKey, payload);
        return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
      }

      const urisRes = await retry(
        () =>
          pc.multicall({
            allowFailure: true,
            contracts: tokenIds.map((tid) => ({
              address: CONTRACT,
              abi: ERC721_TOKENURI_ABI,
              functionName: "tokenURI",
              args: [tid],
            })),
          }),
        2
      );

      const cards = tokenIds.map((tid, idx) => {
        const uri = (urisRes as any)[idx]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        const image = svg ? svgToDataUrl(svg) : null;
        return { tokenId: tid.toString(), image };
      });

      const payload = {
        ok: true,
        contract: CONTRACT,
        latest: latest.toString(),
        cards,
      };

      cacheSet(cacheKey, payload);
      return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
    } catch (e: any) {
      lastErr = e;
      // move to next RPC
      await sleep(120);
    }
  }

  // No RPC succeeded
  return NextResponse.json(
    {
      ok: false,
      error: "Base RPC temporarily unavailable",
      detail: safeErrMsg(lastErr),
      contract: CONTRACT,
      rpcsTriedCount: rpcs.length,
      hint: "Set BASEBOTS_RPC_URLS to reliable Base RPC endpoints (comma-separated).",
    },
    { status: 503, headers: { "cache-control": "no-store" } }
  );
}
