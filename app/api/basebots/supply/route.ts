// app/api/basebots/supply/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http, formatEther } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = createPublicClient({
  chain: base,
  transport: http(), // set NEXT_PUBLIC_RPC_URL if you want a custom RPC
});

export async function GET() {
  try {
    const [mintPrice, totalMinted, maxSupply] = await Promise.all([
      client.readContract({ ...BASEBOTS, functionName: "mintPrice" }),
      client.readContract({ ...BASEBOTS, functionName: "totalMinted" }),
      client.readContract({ ...BASEBOTS, functionName: "MAX_SUPPLY" }),
    ]);

    return NextResponse.json({
      ok: true,
      chainId: client.chain?.id ?? 8453,
      address: BASEBOTS.address,
      mintPriceWei: mintPrice.toString(),
      mintPriceEth: formatEther(mintPrice),
      totalMinted: Number(totalMinted),
      maxSupply: Number(maxSupply),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "read failed" }, { status: 500 });
  }
}
