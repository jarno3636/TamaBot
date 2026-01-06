// app/api/basebots/recent/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http, zeroAddress } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi"; // <-- adjust path if needed

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Card = { tokenId: string; image: string | null };

type PublicClientLike = {
  getBlockNumber: () => Promise<bigint>;
  getLogs: (args: any) => Promise<any[]>;
  multicall: (args: any) => Promise<any[]>;
};

const CONTRACT = BASEBOTS.address;

// Minted(minter, fid) where fid == tokenId
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

const TOKEN_URI_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

function getRpcs() {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const envList = env ? env.split(",").map((s) => s.trim()).filter(Boolean) : [];

  // add more public fallbacks to reduce 503s
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
  if (!s.includes("xmlns=")) s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  if (!/preserveAspectRatio=/.test(s)) s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
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

function sortLogsNewestFirst(logs: any[]) {
  logs.sort((a, b) => {
    const ab = a.blockNumber ?? 0n;
    const bb = b.blockNumber ?? 0n;
    if (ab === bb) return Number((b.logIndex ?? 0) - (a.logIndex ?? 0));
    return ab < bb ? 1 : -1;
  });
}

/**
 * Scan backwards in windows until we find enough minted fids/tokenIds.
 * Works even when tokenId == fid and fid is huge/non-sequential.
 */
async function collectRecentFids(pc: PublicClientLike, want: number, deployBlock: bigint) {
  const latest = await withTimeout(pc.getBlockNumber(), 20_000, "getBlockNumber");

  let window = 200_000n;          // start window
  const maxWindow = 2_000_000n;   // cap
  const maxLoops = 20;            // how many expansions
  const overfetch = Math.max(want * 10, 40);

  const collected: bigint[] = [];

  for (let loop = 0; loop < maxLoops && collected.length < overfetch; loop++) {
    const toBlock = latest;
    const fromBlock = latest > window ? latest - window : 0n;
    const from = fromBlock < deployBlock ? deployBlock : fromBlock;

    // 1) Minted(fid)
    try {
      const logs = await withTimeout(
        pc.getLogs({ address: CONTRACT, event: MINTED_EVENT, fromBlock: from, toBlock }),
        25_000,
        "getLogs(Minted)"
      );

      sortLogsNewestFirst(logs);

      for (const l of logs) {
        const fid = (l.args as any)?.fid;
        if (typeof fid === "bigint") collected.push(fid);
        if (collected.length >= overfetch) break;
      }
    } catch {
      // ignore and fallback below
    }

    // 2) Fallback: Transfer(from=0) => tokenId
    if (collected.length < overfetch) {
      try {
        const logs = await withTimeout(
          pc.getLogs({
            address: CONTRACT,
            event: TRANSFER_EVENT,
            args: { from: zeroAddress },
            fromBlock: from,
            toBlock,
          }),
          25_000,
          "getLogs(Transfer)"
        );

        sortLogsNewestFirst(logs);

        for (const l of logs) {
          const tokenId = (l.args as any)?.tokenId;
          if (typeof tokenId === "bigint") collected.push(tokenId);
          if (collected.length >= overfetch) break;
        }
      } catch {
        // ignore
      }
    }

    // If still nothing, expand search window and try again
    window = window < maxWindow ? window * 2n : maxWindow;
    await sleep(120);
  }

  return uniqNewestBigints(collected);
}

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
      25_000,
      "multicall(tokenURI)"
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
  const deployBlock = BigInt(searchParams.get("deployBlock") || "0"); // pass this if you know it

  const rpcs = getRpcs();
  let lastErr: any = null;

  for (const rpc of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpc, { timeout: 30_000, batch: false }),
      }) as unknown as PublicClientLike;

      const fids = await collectRecentFids(pc, n, deployBlock);

      if (fids.length === 0) {
        return NextResponse.json(
          {
            ok: true,
            contract: CONTRACT,
            deployBlock: deployBlock.toString(),
            foundFids: 0,
            returned: 0,
            cards: [] as Card[],
            note: "No Minted/Transfer(from=0) events found in scanned range. Increase deployBlock coverage or ensure contract address is correct.",
          },
          { headers: { "cache-control": "no-store" } }
        );
      }

      const cards = await buildCards(pc, fids, n);

      return NextResponse.json(
        {
          ok: true,
          contract: CONTRACT,
          deployBlock: deployBlock.toString(),
          foundFids: fids.length,
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
    { ok: false, error: "Base RPC temporarily unavailable", detail: safeErrMsg(lastErr) },
    { status: 503, headers: { "cache-control": "no-store" } }
  );
}
