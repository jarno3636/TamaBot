import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTRACT = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as const;

// Minted(minter, fid) where fid == tokenId
const MINTED_EVENT = {
  type: "event",
  name: "Minted",
  inputs: [
    { indexed: true, name: "minter", type: "address" },
    { indexed: true, name: "fid", type: "uint256" },
  ],
} as const;

const TOKEN_URI_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

type Card = { tokenId: string; image: string | null };

// ✅ Minimal client interface to avoid viem type mismatches in Next build
type PublicClientLike = {
  getBlockNumber: () => Promise<bigint>;
  getLogs: (args: any) => Promise<any[]>;
  multicall: (args: any) => Promise<any[]>;
};

function getRpcs() {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const envList = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return [...new Set([...envList, "https://mainnet.base.org", "https://base.publicnode.com"])];
}

function decodeB64(b64: string) {
  try {
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

      // Basebots often: meta.image = data:image/svg+xml;base64,...
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

      // Sometimes: meta.image_data contains raw svg
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

function uniqNewestBigints(list: bigint[]) {
  const seen = new Set<string>();
  const out: bigint[] = [];
  for (const x of list) {
    const k = x.toString();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
  }
  return out;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(p: Promise<T>, ms: number) {
  let t: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

// Scan backwards in windows until we have enough candidate FIDs
async function collectRecentFids(pc: PublicClientLike, want: number) {
  const latest = await withTimeout(pc.getBlockNumber(), 20_000);

  const WINDOW = 250_000n; // larger window = fewer calls
  const MAX_WINDOWS = 14;  // up to 3.5M blocks scanned
  const OVERFETCH = Math.max(want * 10, 40);

  const collected: bigint[] = [];

  for (let w = 0; w < MAX_WINDOWS && collected.length < OVERFETCH; w++) {
    const toBlock = latest - BigInt(w) * WINDOW;
    const fromBlock = toBlock > WINDOW ? toBlock - WINDOW : 0n;

    const logs = await withTimeout(
      pc.getLogs({
        address: CONTRACT,
        event: MINTED_EVENT,
        fromBlock,
        toBlock,
      }),
      25_000
    );

    // newest first
    logs.sort((a, b) => {
      const ab = a.blockNumber ?? 0n;
      const bb = b.blockNumber ?? 0n;
      if (ab === bb) return Number((b.logIndex ?? 0) - (a.logIndex ?? 0));
      return ab < bb ? 1 : -1;
    });

    for (const l of logs) {
      const fid = (l.args as any)?.fid as bigint | undefined;
      if (typeof fid === "bigint") collected.push(fid);
      if (collected.length >= OVERFETCH) break;
    }

    await sleep(90);
  }

  return uniqNewestBigints(collected);
}

// Turn candidate FIDs into actual SVG cards, skipping failures/nulls until we fill n
async function buildCards(pc: PublicClientLike, fids: bigint[], n: number) {
  const cards: Card[] = [];
  const BATCH = 16;

  for (let i = 0; i < fids.length && cards.length < n; i += BATCH) {
    const batch = fids.slice(i, i + BATCH);

    const uris = await withTimeout(
      pc.multicall({
        allowFailure: true,
        contracts: batch.map((fid) => ({
          address: CONTRACT,
          abi: TOKEN_URI_ABI,
          functionName: "tokenURI",
          args: [fid],
        })),
      }),
      25_000
    );

    for (let j = 0; j < batch.length && cards.length < n; j++) {
      const fid = batch[j];
      const uri = (uris[j] as any)?.result as string | undefined;
      if (!uri) continue;

      const svg = extractSvg(uri);
      if (!svg) continue;

      cards.push({ tokenId: fid.toString(), image: svgToDataUrl(svg) });
    }

    await sleep(60);
  }

  return cards;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));

  for (const rpc of getRpcs()) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpc, { timeout: 30_000, batch: false }),
      }) as unknown as PublicClientLike;

      const fids = await collectRecentFids(pc, n);
      const cards = await buildCards(pc, fids, n);

      return NextResponse.json(
        {
          ok: true,
          contract: CONTRACT,
          foundFids: fids.length,
          returned: cards.length,
          cards,
        },
        { headers: { "cache-control": "no-store" } }
      );
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { ok: false, error: "Base RPC temporarily unavailable" },
    { status: 503, headers: { "cache-control": "no-store" } }
  );
}
