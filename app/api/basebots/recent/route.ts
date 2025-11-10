// app/api/basebots/recent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
const TRANSFER = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);
const ZERO = "0x0000000000000000000000000000000000000000" as const;

// Provider-safe chunking (Base RPC often limits long ranges)
async function getLogsChunked({
  client,
  address,
  fromBlock,
  toBlock,
  chunkSize = 5_000n,
}: {
  client: ReturnType<typeof createPublicClient>;
  address: `0x${string}`;
  fromBlock: bigint;
  toBlock: bigint;
  chunkSize?: bigint;
}) {
  const logs: any[] = [];
  let start = fromBlock;
  while (start <= toBlock) {
    const end = start + chunkSize - 1n > toBlock ? toBlock : start + chunkSize - 1n;
    // eslint-disable-next-line no-await-in-loop
    const part = await client.getLogs({
      address,
      event: TRANSFER,
      fromBlock: start,
      toBlock: end,
      args: { from: ZERO },
    });
    logs.push(...part);
    start = end + 1n;
  }
  return logs;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // how many items to return
    const limit = Math.max(1, Math.min(25, Number(searchParams.get("limit") || 3)));

    // choose lookback strategy
    const sinceBlocksParam = searchParams.get("sinceBlocks");
    const hoursParam = searchParams.get("hours");

    // RPC
    const rpc =
      process.env.NEXT_PUBLIC_BASE_RPC ||
      process.env.RPC_URL ||
      "https://mainnet.base.org";

    const client = createPublicClient({ chain: base, transport: http(rpc) });
    const latest = await client.getBlockNumber();

    // Default: ~200k blocks (~several hours on Base). You can override:
    // ?sinceBlocks=50000  OR  ?hours=2
    let lookback = 200_000n;
    if (sinceBlocksParam) {
      const sb = BigInt(Math.max(1, Number(sinceBlocksParam)));
      lookback = sb;
    } else if (hoursParam) {
      // Base ~ 2s/block ≈ 1800 blocks/hour — be generous
      const hrs = Math.max(1, Number(hoursParam));
      lookback = BigInt(hrs * 2_200); // buffer
    }

    const fromBlock = latest > lookback ? latest - lookback : 0n;
    const toBlock = latest;

    // Pull logs in chunks to avoid RPC 413/timeout issues
    const logs = await getLogsChunked({
      client,
      address: BASEBOTS.address as `0x${string}`,
      fromBlock,
      toBlock,
      chunkSize: 5_000n, // safe default for Base RPCs
    });

    // Sort newest first (blockNumber desc, then txIndex desc, then logIndex desc)
    logs.sort((a, b) => {
      if (a.blockNumber !== b.blockNumber) return Number(b.blockNumber - a.blockNumber);
      if (a.transactionIndex !== b.transactionIndex)
        return Number(b.transactionIndex - a.transactionIndex);
      return Number((b.logIndex ?? 0n) - (a.logIndex ?? 0n));
    });

    const pick = logs.slice(0, limit);

    // Optional: attach block timestamps (batch unique blocks)
    const uniqueBlocks = Array.from(new Set(pick.map((l) => l.blockNumber.toString()))).map(
      (s) => BigInt(s)
    );
    const blockMap = new Map<bigint, number>();
    await Promise.all(
      uniqueBlocks.map(async (bn) => {
        const blk = await client.getBlock({ blockNumber: bn });
        blockMap.set(bn, Number(blk.timestamp) * 1000);
      })
    );

    const items = pick.map((l) => ({
      tokenId: l.args.tokenId?.toString() || "",
      to: l.args.to as `0x${string}`,
      txHash: l.transactionHash as `0x${string}`,
      blockNumber: Number(l.blockNumber),
      timestamp: blockMap.get(l.blockNumber),
    }));

    return NextResponse.json(
      { ok: true, items, latestBlock: Number(latest) },
      {
        headers: {
          "cache-control": "no-store, max-age=0",
        },
      }
    );
  } catch (e: any) {
    const msg = String(e?.message || e || "failed");
    // Friendlier error for upstream cluster hiccups
    if (/timeout|ECONN|ENOTFOUND|fetch failed|503/i.test(msg)) {
      return NextResponse.json(
        { ok: false, error: "Upstream RPC is busy. Try again shortly." },
        { status: 503 }
      );
    }
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
