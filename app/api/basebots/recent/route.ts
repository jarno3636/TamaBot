import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 40;

// ✅ Basebots contract (…222B4)
const CONTRACT: Address = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4";

// Minimal ABI only (no giant ABI imports)
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

type ApiCard = { tokenId: string; fid: string | null; image: string | null };
type ApiPayload =
  | { ok: true; contract: string; cards: ApiCard[] }
  | { ok: false; contract: string; error: string; detail?: string };

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

function safeErrMsg(e: any) {
  const msg = e?.shortMessage || e?.message || String(e) || "Unknown error";
  return msg.replace(/https?:\/\/\S+/g, "[rpc]");
}

function getRpcList() {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const envList = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const fallbacks = ["https://mainnet.base.org", "https://base.publicnode.com"];
  return Array.from(new Set([...envList, ...fallbacks]));
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

function ipfsToHttp(uri: string) {
  const clean = uri.replace("ipfs://", "");
  return `https://ipfs.io/ipfs/${clean}`;
}

function b64ToString(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString();
  } catch {
    return "";
  }
}

function svgToDataUrl(svg: string) {
  let s = svg.includes('xmlns="http://www.w3.org/2000/svg"')
    ? svg
    : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

function inferFid(meta: any): string | null {
  // attributes: [{ trait_type: "FID", value: "123" }]
  const attrs = Array.isArray(meta?.attributes) ? meta.attributes : [];
  for (const a of attrs) {
    const tt = String(a?.trait_type || a?.traitType || "").toLowerCase();
    if (tt === "fid" || tt.includes("fid")) {
      const v = a?.value;
      if (v !== undefined && v !== null) return String(v);
    }
  }

  // name: "Basebot #123" or "FID #123"
  const name = typeof meta?.name === "string" ? meta.name : "";
  const m = name.match(/fid\s*#?\s*(\d+)/i);
  if (m?.[1]) return m[1];

  return null;
}

/**
 * Normalize image from metadata:
 * - image_data raw svg -> data url
 * - image data:url -> return
 * - image ipfs:// -> gateway https
 * - image https:// -> return
 */
function imageFromMeta(meta: any): string | null {
  if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
    return svgToDataUrl(meta.image_data);
  }

  const img = meta?.image;
  if (typeof img !== "string" || !img.trim()) return null;

  if (img.startsWith("data:image/")) return img;
  if (img.startsWith("ipfs://")) return ipfsToHttp(img);
  if (img.startsWith("http://") || img.startsWith("https://")) return img;

  // sometimes raw svg string (rare)
  if (img.includes("<svg")) return svgToDataUrl(img);

  return null;
}

/**
 * tokenURI can be:
 * - data:application/json;base64,<...>
 * - data:application/json;utf8,<...>
 * - ipfs://...json
 * - https://...json
 */
async function tokenUriToMeta(tokenUri: string): Promise<any | null> {
  if (!tokenUri) return null;

  // base64 json
  if (tokenUri.startsWith("data:application/json;base64,")) {
    const jsonB64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = b64ToString(jsonB64);
    if (!jsonStr) return null;
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  // utf8 json
  if (tokenUri.startsWith("data:application/json;utf8,")) {
    const jsonStr = decodeURIComponent(tokenUri.slice("data:application/json;utf8,".length));
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  }

  // raw json text
  if (tokenUri.trim().startsWith("{")) {
    try {
      return JSON.parse(tokenUri);
    } catch {
      return null;
    }
  }

  // offchain json
  const url =
    tokenUri.startsWith("ipfs://") ? ipfsToHttp(tokenUri) : tokenUri.startsWith("http") ? tokenUri : null;

  if (!url) return null;

  const res = await withTimeout(fetch(url, { cache: "no-store" }), 12_000, "fetch tokenURI json");
  if (!res.ok) return null;

  const text = await withTimeout(res.text(), 10_000, "read tokenURI json");
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const cacheKey = `n=${n}`;

  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { headers: { "cache-control": "no-store" } });
  }

  const rpcs = getRpcList();
  if (!rpcs.length) {
    const payload: ApiPayload = { ok: false, contract: CONTRACT, error: "Base RPC temporarily unavailable" };
    cacheSet(cacheKey, payload);
    return NextResponse.json(payload, { status: 503, headers: { "cache-control": "no-store" } });
  }

  let lastErr: any = null;

  for (const rpcUrl of rpcs) {
    try {
      const pc: any = createPublicClient({
        chain: base,
        transport: http(rpcUrl, { timeout: 25_000, batch: false }),
      });

      // totalMinted is our upper bound (fast path)
      const totalMinted = await withTimeout(
        retry(() => pc.readContract({ address: CONTRACT, abi: ABI, functionName: "totalMinted" }), 2),
        18_000,
        "totalMinted"
      );

      const total = BigInt(totalMinted as unknown as bigint);
      if (total <= 0n) {
        const payload: ApiPayload = { ok: true, contract: CONTRACT, cards: [] };
        cacheSet(cacheKey, payload);
        return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
      }

      // Walk backwards and collect N cards that actually yield a usable image/meta
      const cards: ApiCard[] = [];
      const MAX_PROBES = 120; // allows gaps without going crazy

      for (let i = 0n; i < BigInt(MAX_PROBES) && cards.length < n; i++) {
        // Try both common conventions:
        // - tokenIds are 1..total
        // - tokenIds are 0..total-1
        const candidates = [total - i, total - 1n - i].filter((x) => x >= 0n);

        for (const tid of candidates) {
          if (cards.length >= n) break;
          // de-dupe candidates
          if (cards.some((c) => c.tokenId === tid.toString())) continue;

          let uri: string | null = null;
          try {
            uri = await withTimeout(
              retry(
                () =>
                  pc.readContract({
                    address: CONTRACT,
                    abi: ABI,
                    functionName: "tokenURI",
                    args: [tid],
                  }),
                1
              ),
              16_000,
              "tokenURI"
            );
          } catch {
            continue;
          }

          const meta = await tokenUriToMeta(uri || "");
          if (!meta) continue;

          const image = imageFromMeta(meta);
          const fid = inferFid(meta);

          // only accept if we actually got an image
          if (image) {
            cards.push({ tokenId: tid.toString(), fid, image });
          }
        }
      }

      const payload: ApiPayload = { ok: true, contract: CONTRACT, cards };
      cacheSet(cacheKey, payload);
      return NextResponse.json(payload, { headers: { "cache-control": "no-store" } });
    } catch (e: any) {
      lastErr = e;
      await sleep(120);
    }
  }

  const payload: ApiPayload = {
    ok: false,
    contract: CONTRACT,
    error: "Base RPC temporarily unavailable",
    detail: safeErrMsg(lastErr),
  };
  cacheSet(cacheKey, payload);
  return NextResponse.json(payload, { status: 503, headers: { "cache-control": "no-store" } });
}
