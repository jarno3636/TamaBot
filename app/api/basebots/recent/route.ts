// app/api/basebots/recent/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BASEBOTS, BASEBOTS_RECENT_ABI } from "@/lib/abi"; // <-- update path if yours differs

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Card = { tokenId: string; image: string | null };

type PublicClientLike = {
  readContract: (args: any) => Promise<any>;
  multicall: (args: any) => Promise<any[]>;
};

function getRpcs() {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const envList = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // Add more public fallbacks to reduce 503s.
  const fallbacks = [
    "https://mainnet.base.org",
    "https://base.publicnode.com",
    "https://base.drpc.org",
    "https://1rpc.io/base",
  ];

  return Array.from(new Set([...envList, ...fallbacks]));
}

function safeErrMsg(e: any): string {
  const msg = e?.shortMessage || e?.message || String(e) || "Unknown error";
  return msg.replace(/https?:\/\/\S+/g, "[rpc]");
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout") {
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

function decodeB64(b64: string) {
  try {
    // default toString() is fine for Basebots JSON/SVG payloads
    return Buffer.from(b64, "base64").toString();
  } catch {
    return "";
  }
}

function extractSvg(tokenUri: string): string | null {
  if (!tokenUri) return null;

  // data:application/json;base64,<...>
  if (tokenUri.startsWith("data:application/json;base64,")) {
    const json = decodeB64(tokenUri.slice("data:application/json;base64,".length));
    if (!json) return null;

    try {
      const meta = JSON.parse(json);

      if (typeof meta?.image === "string") {
        const img = meta.image as string;

        if (img.startsWith("data:image/svg+xml;base64,")) {
          const svg = decodeB64(img.slice("data:image/svg+xml;base64,".length));
          return svg.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg.includes("<svg") ? svg : null;
        }
      }

      // Some versions embed raw svg here
      if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
        return meta.image_data;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function svgToDataUrl(svg: string) {
  let s = svg;

  if (!s.includes("xmlns=")) {
    s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

/**
 * ✅ Deterministic “recent mints” (no logs):
 * - Your contract includes totalMinted()
 * - You confirmed tokenId == fid
 *
 * IMPORTANT: totalMinted() returns a COUNT, not “latest tokenId”.
 * If token IDs start at 1: latestId = totalMinted
 * If token IDs start at 0: latestId = totalMinted - 1
 *
 * We support both by trying a batch of candidates and keeping the first N tokenURIs that succeed.
 */
async function getCandidateTokenIds(pc: PublicClientLike, n: number) {
  const totalMintedRaw = await withTimeout(
    retry(
      () =>
        pc.readContract({
          address: BASEBOTS.address,
          abi: BASEBOTS_RECENT_ABI,
          functionName: "totalMinted",
        }),
      2
    ),
    18_000,
    "totalMinted"
  );

  const total = BigInt(totalMintedRaw ?? 0);
  if (total <= 0n) return { total, candidates: [] as bigint[] };

  // Overfetch so we can survive holes / failures / start index ambiguity
  const want = BigInt(Math.min(40, Math.max(12, n * 10)));
  const out: bigint[] = [];

  // Candidate set A: assume start-at-1 (latestId = total)
  for (let i = 0n; i < want; i++) {
    const id = total - i;
    if (id > 0n) out.push(id);
  }

  // Candidate set B: assume start-at-0 (latestId = total-1)
  for (let i = 1n; i <= want; i++) {
    const id = total - i; // total-1, total-2, ...
    if (id >= 0n) out.push(id);
  }

  // de-dupe while preserving order
  const seen = new Set<string>();
  const candidates: bigint[] = [];
  for (const id of out) {
    const k = id.toString();
    if (!seen.has(k)) {
      seen.add(k);
      candidates.push(id);
    }
  }

  return { total, candidates };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));

  const rpcs = getRpcs();
  if (!rpcs.length) {
    return NextResponse.json(
      { ok: false, error: "Base RPC temporarily unavailable" },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  let lastErr: any = null;

  for (const rpc of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpc, { timeout: 25_000, batch: false }),
      }) as unknown as PublicClientLike;

      const { total, candidates } = await getCandidateTokenIds(pc, n);

      if (candidates.length === 0) {
        return NextResponse.json(
          { ok: true, contract: BASEBOTS.address, totalMinted: total.toString(), returned: 0, cards: [] as Card[] },
          { headers: { "cache-control": "no-store" } }
        );
      }

      // multicall tokenURI for candidate ids
      const uris = await withTimeout(
        retry(
          () =>
            pc.multicall({
              allowFailure: true,
              contracts: candidates.map((id) => ({
                address: BASEBOTS.address,
                abi: BASEBOTS_RECENT_ABI,
                functionName: "tokenURI",
                args: [id],
              })),
            }),
          2
        ),
        25_000,
        "multicall(tokenURI)"
      );

      // Build cards from the first N SUCCESSFUL tokenURIs (this fixes start-at-0 vs start-at-1)
      const cards: Card[] = [];
      for (let i = 0; i < candidates.length && cards.length < n; i++) {
        const id = candidates[i];
        const uri = (uris[i] as any)?.result as string | undefined;
        if (!uri) continue;

        const svg = extractSvg(uri);
        if (!svg) continue;

        cards.push({
          tokenId: id.toString(), // tokenId == fid
          image: svgToDataUrl(svg),
        });
      }

      return NextResponse.json(
        {
          ok: true,
          contract: BASEBOTS.address,
          totalMinted: total.toString(),
          returned: cards.length,
          cards,
        },
        { headers: { "cache-control": "no-store" } }
      );
    } catch (e) {
      lastErr = e;
      await sleep(120);
      continue;
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: "Base RPC temporarily unavailable",
      detail: safeErrMsg(lastErr),
      hint: "Set BASEBOTS_RPC_URLS to reliable Base RPC endpoints (comma-separated).",
    },
    { status: 503, headers: { "cache-control": "no-store" } }
  );
}
