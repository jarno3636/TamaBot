import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { zeroAddress } from "viem";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ERC721 Transfer event */
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

/* ───────────────── server cache (no RPC leaks) ─────────────────
   NOTE: This is in-memory per server instance. On Vercel, it works
   well when warm; if cold, it just fetches fresh.
*/
type CacheValue = { ts: number; cards: Array<{ tokenId: string; image: string | null }> };
declare global {
  // eslint-disable-next-line no-var
  var __basebots_recent_cache__: CacheValue | undefined;
}
const CACHE_TTL_MS = 60_000; // 60s “fresh”, but we can serve stale too

function getCache(): CacheValue | null {
  const v = globalThis.__basebots_recent_cache__;
  if (!v) return null;
  return v;
}
function setCache(cards: CacheValue["cards"]) {
  globalThis.__basebots_recent_cache__ = { ts: Date.now(), cards };
}

function getRpcList(): string[] {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const list = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : ["https://mainnet.base.org", "https://base.publicnode.com"];
  return Array.from(new Set(list));
}

function safeB64ToUtf8(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri?.startsWith("data:application/json;base64,")) return null;

  const jsonStr = safeB64ToUtf8(tokenUri.slice("data:application/json;base64,".length));
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
  } catch {}

  return null;
}

function svgToDataUrl(svg: string) {
  let s = svg;
  if (!s.includes('xmlns="http://www.w3.org/2000/svg"')) {
    s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  // base64 is safest for <img> across browsers
  const b64 = Buffer.from(s, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const deployBlock = BigInt(searchParams.get("deployBlock") || "0");

  const contract = BASEBOTS.address as `0x${string}`;
  const rpcs = getRpcList();

  // Return “fresh cache” instantly
  const cached = getCache();
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return NextResponse.json(
      { ok: true, cards: cached.cards.slice(0, n), cached: true },
      { headers: { "cache-control": "no-store" } }
    );
  }

  // Scan windows (fast → bigger)
  const WINDOWS = [1_500n, 5_000n, 20_000n, 80_000n, 250_000n];

  let lastErr: string | null = null;

  for (const rpc of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpc, { timeout: 35_000, batch: false }),
      });

      const latest = await withTimeout(pc.getBlockNumber(), 12_000);

      const found: Array<{ tokenId: bigint; blockNumber: bigint; logIndex: number }> = [];

      for (const win of WINDOWS) {
        const from0 = latest > win ? latest - win : 0n;
        const fromBlock = from0 < deployBlock ? deployBlock : from0;

        // mint = Transfer(from=0x0)
        const logs = await withTimeout(
          pc.getLogs({
            address: contract,
            event: TRANSFER_EVENT,
            args: { from: zeroAddress },
            fromBlock,
            toBlock: latest,
          }),
          20_000
        );

        // newest first
        logs.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
          return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
        });

        for (const l of logs) {
          const tid = (l.args as any)?.tokenId as bigint | undefined;
          if (!tid) continue;
          if (!found.some((x) => x.tokenId === tid)) {
            found.push({ tokenId: tid, blockNumber: l.blockNumber!, logIndex: l.logIndex ?? 0 });
            if (found.length >= n) break;
          }
        }

        if (found.length >= n) break;
      }

      const tokenIds = found
        .sort((a, b) => (a.blockNumber === b.blockNumber ? b.logIndex - a.logIndex : Number(b.blockNumber - a.blockNumber)))
        .slice(0, n)
        .map((x) => x.tokenId);

      if (tokenIds.length === 0) {
        setCache([]);
        return NextResponse.json({ ok: true, cards: [] }, { headers: { "cache-control": "no-store" } });
      }

      // tokenURI multicall
      const uris = await withTimeout(
        pc.multicall({
          allowFailure: true,
          contracts: tokenIds.map((tid) => ({
            address: contract,
            abi: ERC721_TOKENURI_ABI,
            functionName: "tokenURI",
            args: [tid],
          })),
        }),
        20_000
      );

      const cards = tokenIds.map((tid, i) => {
        const uri = (uris as any)[i]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        return { tokenId: tid.toString(), image: svg ? svgToDataUrl(svg) : null };
      });

      // Cache last good result
      setCache(cards);

      return NextResponse.json(
        { ok: true, cards, cached: false },
        { headers: { "cache-control": "no-store" } }
      );
    } catch {
      // 🔒 Do NOT leak rpc or raw error
      lastErr = "Base RPC temporarily unavailable";
    }
  }

  // If we have ANY cached result, serve it even if stale
  if (cached?.cards?.length) {
    return NextResponse.json(
      { ok: true, cards: cached.cards.slice(0, n), cached: true, stale: true, note: "Served last known result." },
      { headers: { "cache-control": "no-store" } }
    );
  }

  return NextResponse.json(
    { ok: false, error: lastErr || "Unable to fetch recent mints right now." },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
