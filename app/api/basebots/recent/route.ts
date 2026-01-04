import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MINTED_EVENT = {
  type: "event",
  name: "Minted",
  inputs: [
    { indexed: true, name: "minter", type: "address" },
    { indexed: true, name: "fid", type: "uint256" },
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

/** ---------- tiny helpers ---------- */

function safeB64ToUtf8(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri) return null;

  if (tokenUri.startsWith("data:application/json;base64,")) {
    const b64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = safeB64ToUtf8(b64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
        return meta.image_data;
      }

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

/**
 * ✅ Most reliable way to embed SVG in <img>: base64 data URL.
 * Avoids weird characters / URL encoding issues.
 */
function svgToDataUrlBase64(svg: string) {
  let s = svg;

  // ensure xmlns exists (some renderers fail without it)
  if (!s.includes('xmlns="http://www.w3.org/2000/svg"')) {
    s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // encourage proper scaling
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  const b64 = Buffer.from(s, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

function getRpcList() {
  const env = (process.env.BASE_RPC_URLS || "").trim();
  const list = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : [process.env.BASE_RPC_URL || "", "https://mainnet.base.org", "https://base.publicnode.com"]
        .map((s) => s.trim())
        .filter(Boolean);

  // de-dupe
  return Array.from(new Set(list));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
      }),
    ]);
  } finally {
    if (t) clearTimeout(t);
  }
}

// tiny in-memory cache (per server instance)
type CacheEntry = { ts: number; payload: any };
const CACHE_KEY = "__basebots_recent_cache__";
function getCache(): Map<string, CacheEntry> {
  const g = globalThis as any;
  if (!g[CACHE_KEY]) g[CACHE_KEY] = new Map<string, CacheEntry>();
  return g[CACHE_KEY] as Map<string, CacheEntry>;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const deployBlock = BigInt(searchParams.get("deployBlock") || "0");

  const contract = BASEBOTS.address as `0x${string}`;
  const rpcs = getRpcList();

  if (!rpcs.length) {
    return NextResponse.json(
      { ok: false, error: "No RPC configured. Set BASE_RPC_URL or BASE_RPC_URLS." },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  // ✅ Cache: makes repeat refreshes nearly instant
  const cache = getCache();
  const cacheId = `${contract.toLowerCase()}:${n}:${deployBlock.toString()}`;
  const cached = cache.get(cacheId);
  const now = Date.now();
  if (cached && now - cached.ts < 30_000) {
    return NextResponse.json(cached.payload, { headers: { "cache-control": "no-store" } });
  }

  let lastErr: any = null;

  for (const rpcUrl of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpcUrl, {
          timeout: 25_000,
          batch: false,
          retryCount: 0,
        }),
      });

      const latest = await withTimeout(pc.getBlockNumber(), 12_000, "getBlockNumber");

      // ✅ Fast-first scanning: start small, expand only if needed
      // 2k blocks is usually enough for "recent mints" without big RPC load.
      const WINDOWS = [2_000n, 8_000n, 25_000n, 80_000n, 200_000n];

      const found: Array<{ fid: bigint; blockNumber: bigint; logIndex: number }> = [];

      for (const win of WINDOWS) {
        const fromBlock = (() => {
          const raw = latest > win ? latest - win : 0n;
          return raw < deployBlock ? deployBlock : raw;
        })();

        const logs = await withTimeout(
          pc.getLogs({
            address: contract,
            event: MINTED_EVENT,
            fromBlock,
            toBlock: latest,
          }),
          15_000,
          "getLogs"
        );

        logs.sort((a, b) => {
          const ab = a.blockNumber ?? 0n;
          const bb = b.blockNumber ?? 0n;
          if (ab === bb) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
          return Number(bb - ab);
        });

        for (const l of logs) {
          const fid = (l.args as any)?.fid as bigint | undefined;
          if (fid === undefined) continue;
          if (!found.some((x) => x.fid === fid)) {
            found.push({ fid, blockNumber: l.blockNumber!, logIndex: l.logIndex ?? 0 });
            if (found.length >= n) break;
          }
        }

        if (found.length >= n) break;
      }

      const tokenIds = found
        .sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
          return Number(b.blockNumber - a.blockNumber);
        })
        .slice(0, n)
        .map((x) => x.fid);

      // If we found nothing, don’t hang—return a fast ok with empty cards
      if (tokenIds.length === 0) {
        const payload = { ok: true, contract, rpcUrl, latest: latest.toString(), cards: [] as any[] };
        cache.set(cacheId, { ts: now, payload });
        return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
      }

      // tokenURI multicall
      const urisRes = await withTimeout(
        pc.multicall({
          allowFailure: true,
          contracts: tokenIds.map((tid) => ({
            address: contract,
            abi: ERC721_TOKENURI_ABI,
            functionName: "tokenURI",
            args: [tid],
          })),
        }),
        15_000,
        "multicall(tokenURI)"
      );

      const cards = tokenIds.map((tid, i) => {
        const uri = (urisRes as any)[i]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        const image = svg ? svgToDataUrlBase64(svg) : null;
        return { tokenId: tid.toString(), image };
      });

      const payload = {
        ok: true,
        contract,
        rpcUrl,
        latest: latest.toString(),
        cards,
      };

      cache.set(cacheId, { ts: now, payload });
      return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
    } catch (e: any) {
      lastErr = e;
      // small stagger so we don’t instantly hammer the next RPC
      await sleep(250);
    }
  }

  const msg = lastErr?.shortMessage || lastErr?.message || String(lastErr) || "Unknown error";
  return NextResponse.json(
    {
      ok: false,
      error: msg,
      hint:
        "RPC likely rate-limited or slow. For best reliability set BASE_RPC_URLS to paid RPC endpoints (Alchemy/QuickNode), comma-separated.",
      contract,
      rpcsTried: rpcs,
    },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
