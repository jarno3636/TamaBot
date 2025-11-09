import { NextResponse } from "next/server";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

const ZERO = "0x0000000000000000000000000000000000000000";

const transferItem = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)"
);

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(10, Number(searchParams.get("limit") || 3)));

    const rpc = process.env.NEXT_PUBLIC_BASE_RPC || "https://mainnet.base.org";
    const client = createPublicClient({
      chain: base,
      transport: http(rpc),
    });

    const latest = await client.getBlockNumber();

    // Look back some blocks to catch a few recent mints
    // (Adjust if your project mints are very infrequent)
    const lookback = 200_000n; // ~ many hours on Base
    const fromBlock = latest > lookback ? latest - lookback : 0n;
    const toBlock = latest;

    const logs = await client.getLogs({
      address: BASEBOTS.address as `0x${string}`,
      event: transferItem,
      fromBlock,
      toBlock,
      args: { from: ZERO },
    });

    // Sort newest first by blockNumber/txIndex and take the latest N
    const sorted = [...logs].sort((a, b) => {
      if (a.blockNumber === b.blockNumber) return Number(b.transactionIndex - a.transactionIndex);
      return Number(b.blockNumber - a.blockNumber);
    });

    const items = sorted.slice(0, limit).map(l => ({
      tokenId: l.args.tokenId?.toString() || "",
      to: l.args.to as `0x${string}`,
      txHash: l.transactionHash,
      blockNumber: Number(l.blockNumber),
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
