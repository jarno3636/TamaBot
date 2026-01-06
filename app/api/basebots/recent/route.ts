import { NextResponse } from "next/server";
import { createPublicClient, http, zeroAddress } from "viem";
import { base } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTRACT = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as const;

// Minted(minter, fid) where fid == tokenId (your contract-specific event)
const MINTED_EVENT = {
  type: "event",
  name: "Minted",
  inputs: [
    { indexed: true, name: "minter", type: "address" },
    { indexed: true, name: "fid", type: "uint256" },
  ],
} as const;

// ERC721 Transfer fallback (mints are Transfer(from=0x0))
const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: true, name: "tokenId", type: "uint256" },
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

// Minimal interface so Next build doesn’t explode on viem type unions
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

function uniqBigintsNewestFirst(list: bigint[]) {
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

async function withTimeout<T>(p: Promise<T>, ms: number, label = "timeout") {
  let t: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error(label)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

function sortLogsNewestFirst(logs: any[]) {
  logs.sort((a, b) => {
    const ab = a.blockNumber ?? 0n;
    const bb = b.blockNumber ?? 0n;
    if (ab === bb) return Number((b.logIndex ?? 0) - (a.logIndex ?? 0));
    return ab < bb ? 1 : -1;
  });
}

// Scan backwards in smaller windows until we have enough candidate tokenIds (fid == tokenId)
async function collectRecentTokenIds(pc: PublicClientLike, want: number) {
  const latest = await withTimeout(pc.getBlockNumber(), 20_000, "getBlockNumber timeout");

  const WINDOW = 60_000n; // smaller windows => less likely to time out on public RPCs
  const MAX_WINDOWS = 30; // up to ~1.8M blocks
  const OVERFETCH = Math.max(want * 10, 40);

  const collected: bigint[] = [];

  for (let w = 0; w < MAX_WINDOWS && collected.length < OVERFETCH; w++) {
    const offset = BigInt(w) * WINDOW;

    // ✅ clamp toBlock so it never goes negative
    const toBlock = latest > offset ? latest - offset : 0n;
    if (toBlock === 0n && w > 0) break;

    const fromBlock = toBlock > WINDOW ? toBlock - WINDOW : 0n;

    // Try Minted first
    try {
      const logs = await withTimeout(
        pc.getLogs({
          address: CONTRACT,
          event: MINTED_EVENT,
          fromBlock,
          toBlock,
        }),
        22_000,
        "getLogs(Minted) timeout"
      );

      sortLogsNewestFirst(logs);

      for (const l of logs) {
        const fid = (l.args as any)?.fid as bigint | undefined;
        if (typeof fid === "bigint") collected.push(fid);
        if (collected.length >= OVERFETCH) break;
      }
    } catch {
      // ignore per-window failure (rate limit / timeout) and keep scanning
    }

    // If still not enough, fall back to Transfer(from=0) mints
    if (collected.length < OVERFETCH) {
      try {
        const logs = await withTimeout(
          pc.getLogs({
            address: CONTRACT,
            event: TRANSFER_EVENT,
            args: { from: zeroAddress },
            fromBlock,
            toBlock,
          }),
          22_000,
          "getLogs(Transfer) timeout"
        );

        sortLogsNewestFirst(logs);

        for (const l of logs) {
          const tid = (l.args as any)?.tokenId as bigint | undefined;
          if (typeof tid === "bigint") collected.push(tid);
          if (collected.length >= OVERFETCH) break;
        }
      } catch {
        // ignore
      }
    }

    await sleep(90);
  }

  return uniqBigintsNewestFirst(collected);
}

async function buildCards(pc: PublicClientLike, tokenIds: bigint[], n: number) {
  const cards: Card[] = [];
  const BATCH = 16;

  for (let i = 0; i < tokenIds.length && cards.length < n; i += BATCH) {
    const batch = tokenIds.slice(i, i + BATCH);

    const uris = await withTimeout(
      pc.multicall({
        allowFailure: true,
        contracts: batch.map((id) => ({
          address: CONTRACT,
          abi: TOKEN_URI_ABI,
          functionName: "tokenURI",
          args: [id], // tokenId == fid
        })),
      }),
      25_000,
      "multicall(tokenURI) timeout"
    );

    for (let j = 0; j < batch.length && cards.length < n; j++) {
      const id = batch[j];
      const uri = (uris[j] as any)?.result as string | undefined;
      if (!uri) continue;

      const svg = extractSvg(uri);
      if (!svg) {
        cards.push({ tokenId: id.toString(), image: null });
        continue;
      }

      cards.push({ tokenId: id.toString(), image: svgToDataUrl(svg) });
    }

    await sleep(60);
  }

  return cards;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));

  const rpcs = getRpcs();
  let anyRpcWorked = false;

  for (const rpc of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpc, { timeout: 30_000, batch: false }),
      }) as unknown as PublicClientLike;

      // If we can even read the block number, RPC is “working”
      const tokenIds = await collectRecentTokenIds(pc, n);
      anyRpcWorked = true;

      if (tokenIds.length === 0) {
        // ✅ don’t 503 if RPC works but we found nothing in scan window
        return NextResponse.json(
          { ok: true, contract: CONTRACT, found: 0, returned: 0, cards: [] as Card[] },
          { headers: { "cache-control": "no-store" } }
        );
      }

      const cards = await buildCards(pc, tokenIds, n);

      return NextResponse.json(
        { ok: true, contract: CONTRACT, found: tokenIds.length, returned: cards.length, cards },
        { headers: { "cache-control": "no-store" } }
      );
    } catch {
      // try next RPC
      continue;
    }
  }

  // If *nothing* worked at all
  return NextResponse.json(
    {
      ok: false,
      error: "Base RPC temporarily unavailable",
      contract: CONTRACT,
      hint: "Set BASEBOTS_RPC_URLS to a reliable paid RPC (Alchemy/QuickNode/etc). Public RPCs often rate-limit getLogs.",
    },
    { status: anyRpcWorked ? 200 : 503, headers: { "cache-control": "no-store" } }
  );
}
