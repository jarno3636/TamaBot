import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";
import { zeroAddress } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ask Vercel for longer execution (works on plans that support it)
export const maxDuration = 40;

/**
 * ✅ Hard-coded Basebots contract (0x...222B4)
 */
const CONTRACT: Address = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4";

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

const ABI = [
  {
    name: "totalMinted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

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
 * ✅ IMPORTANT FIX:
 * Do NOT type helper params as ReturnType<typeof createPublicClient>
 * (avoids viem type conflicts in monorepos / wagmi installs)
 */
type PublicClientLike = {
  getBlockNumber: (...args: any[]) => Promise<bigint>;
  getLogs: (...args: any[]) => Promise<any[]>;
  readContract: (...args: any[]) => Promise<any>;
  multicall: (...args: any[]) => Promise<any>;
};

/**
 * Small in-memory cache (per server instance)
 */
type ApiCard = { tokenId: string; image: string | null };
type ApiPayload = {
  ok: boolean;
  contract: string;
  latest?: string;
  cards?: ApiCard[];
  error?: string;
  detail?: string;
  hint?: string;
  rpcsTriedCount?: number;
};

type Cached = { at: number; key: string; value: ApiPayload };
let CACHE: Cached | null = null;
const CACHE_TTL_MS = 20_000;

function cacheGet(key: string) {
  if (!CACHE) return null;
  if (CACHE.key !== key) return null;
  if (Date.now() - CACHE.at > CACHE_TTL_MS) return null;
  return CACHE.value;
}
function cacheSet(key: string, value: ApiPayload) {
  CACHE = { at: Date.now(), key, value };
}

/**
 * Do NOT leak RPC URLs in errors
 */
function safeErrMsg(e: any): string {
  const msg = e?.shortMessage || e?.message || String(e) || "Unknown error";
  return msg.replace(/https?:\/\/\S+/g, "[rpc]");
}

/**
 * ✅ base64 decode (NOT utf8-only)
 */
function b64ToString(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString();
  } catch {
    return "";
  }
}

/**
 * Extract raw SVG from tokenURI JSON data URL
 * Supports:
 * - meta.image = data:image/svg+xml;base64,...
 * - meta.image = data:image/svg+xml;utf8,...
 * - meta.image_data = "<svg ...>"
 */
function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri) return null;

  // Most common: data:application/json;base64,...
  if (tokenUri.startsWith("data:application/json;base64,")) {
    const jsonB64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = b64ToString(jsonB64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      if (typeof meta?.image === "string") {
        const img = meta.image as string;

        if (img.startsWith("data:image/svg+xml;base64,")) {
          const svgB64 = img.slice("data:image/svg+xml;base64,".length);
          const svg = b64ToString(svgB64);
          return svg.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg.includes("<svg") ? svg : null;
        }
      }

      if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
        return meta.image_data;
      }

      return null;
    } catch {
      return null;
    }
  }

  // Rare: raw JSON string
  if (tokenUri.trim().startsWith("{")) {
    try {
      const meta = JSON.parse(tokenUri);
      if (typeof meta?.image === "string") {
        const img = meta.image as string;

        if (img.startsWith("data:image/svg+xml;base64,")) {
          const svgB64 = img.slice("data:image/svg+xml;base64,".length);
          const svg = b64ToString(svgB64);
          return svg.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg.includes("<svg") ? svg : null;
        }
      }
      if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) return meta.image_data;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Convert SVG string to a data URL that <img> can render.
 */
function svgToDataUrl(svg: string) {
  let s = svg.includes('xmlns="http://www.w3.org/2000/svg"')
    ? svg
    : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

/**
 * BASEBOTS_RPC_URLS (new env) + safe public fallbacks.
 * Never returned in response.
 */
function getRpcList() {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const envList = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const fallbacks = ["https://mainnet.base.org", "https://base.publicnode.com"];
  return Array.from(new Set([...envList, ...fallbacks]));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

async function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout"): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error(`${label} after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

/**
 * ✅ BEST PATH (no log scanning):
 * - read totalMinted()
 * - last N tokenIds are: total, total-1, ...
 *
 * ✅ FALLBACK PATH:
 * log scan Minted / Transfer(from=0) if totalMinted fails.
 */
async function findRecentTokenIds(
  pc: PublicClientLike,
  n: number,
  deployBlock: bigint
): Promise<{ latest: bigint; tokenIds: bigint[] }> {
  const latest = await retry(() => pc.getBlockNumber(), 2);

  // 1) Prefer totalMinted
  try {
    const totalMinted = await withTimeout(
      pc.readContract({ address: CONTRACT, abi: ABI, functionName: "totalMinted" }),
      18_000,
      "totalMinted timeout"
    );

    const total = BigInt(totalMinted as unknown as bigint);
    if (total > 0n) {
      const ids: bigint[] = [];
      for (let i = 0n; i < BigInt(n); i++) {
        const id = total - i;
        if (id > 0n) ids.push(id);
      }
      if (ids.length) return { latest, tokenIds: ids };
    }
  } catch {
    // fall through to log scan
  }

  // 2) Fallback: log scan (adaptive window)
  let window = 1_200n;
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

    // Minted event (returns fid)
    try {
      const logs = await withTimeout(
        retry(
          () =>
            pc.getLogs({
              address: CONTRACT,
              event: MINTED_EVENT,
              fromBlock: from,
              toBlock,
            }),
          2
        ),
        18_000,
        "getLogs(Minted) timeout"
      );

      sortLogsNewestFirst(logs);

      const ids: bigint[] = [];
      for (const l of logs) {
        const fid = (l.args as any)?.fid as bigint | undefined;
        if (fid !== undefined) ids.push(fid);
        if (ids.length >= n * 3) break;
      }

      await pushUnique(ids);
      if (found.length >= n) break;
    } catch {
      // ignore
    }

    // Transfer(from=0) fallback (returns tokenId)
    try {
      const logs = await withTimeout(
        retry(
          () =>
            pc.getLogs({
              address: CONTRACT,
              event: TRANSFER_EVENT,
              args: { from: zeroAddress },
              fromBlock: from,
              toBlock,
            }),
          2
        ),
        18_000,
        "getLogs(Transfer) timeout"
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

    window = window < maxWindow ? window * 2n : maxWindow;
    await sleep(120);
  }

  return { latest, tokenIds: found.slice(0, n) };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const deployBlock = BigInt(searchParams.get("deployBlock") || "0");

  const cacheKey = `n=${n}&deploy=${deployBlock.toString()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached, { headers: { "cache-control": "no-store" } });

  const rpcs = getRpcList();
  if (!rpcs.length) {
    return NextResponse.json(
      { ok: false, error: "Base RPC temporarily unavailable", contract: CONTRACT },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  let lastErr: any = null;

  for (const rpcUrl of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpcUrl, { timeout: 25_000, batch: false }),
      });

      const { latest, tokenIds } = await findRecentTokenIds(pc as unknown as PublicClientLike, n, deployBlock);

      if (tokenIds.length === 0) {
        const payload: ApiPayload = {
          ok: true,
          contract: CONTRACT,
          latest: latest.toString(),
          cards: [],
        };
        cacheSet(cacheKey, payload);
        return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
      }

      const urisRes = await withTimeout(
        retry(
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
        ),
        22_000,
        "multicall(tokenURI) timeout"
      );

      const cards: ApiCard[] = tokenIds.map((tid, idx) => {
        const uri = (urisRes as any)[idx]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        const image = svg ? svgToDataUrl(svg) : null;
        return { tokenId: tid.toString(), image };
      });

      const payload: ApiPayload = {
        ok: true,
        contract: CONTRACT,
        latest: latest.toString(),
        cards,
      };

      cacheSet(cacheKey, payload);
      return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
    } catch (e: any) {
      lastErr = e;
      await sleep(120);
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Base RPC temporarily unavailable",
      detail: safeErrMsg(lastErr),
      contract: CONTRACT,
      rpcsTriedCount: rpcs.length,
      hint: "Set BASEBOTS_RPC_URLS to reliable Base mainnet RPC endpoints (comma-separated).",
    },
    { status: 503, headers: { "cache-control": "no-store" } }
  );
}
