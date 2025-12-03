import { NextResponse } from "next/server";
import { createPublicClient, http, getContract, parseAbi } from "viem";
import { base } from "viem/chains";

const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

const client = createPublicClient({
  chain: base,
  transport: http(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");

    if (!address || !address.startsWith("0x") || address.length !== 42) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing token address" },
        { status: 400 }
      );
    }

    const token = getContract({
      address: address as `0x${string}`,
      abi: ERC20_ABI,
      client,
    });

    const [name, symbol, decimals] = await Promise.all([
      token.read.name().catch(() => ""),
      token.read.symbol().catch(() => ""),
      token.read.decimals().catch(() => 18),
    ]);

    return NextResponse.json({
      ok: true,
      address,
      name,
      symbol,
      decimals: Number(decimals),
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Token lookup failed" },
      { status: 500 }
    );
  }
}
