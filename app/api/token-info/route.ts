// app/api/token-info/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, getContract, http, isAddress, parseAbi } from "viem";
import { base } from "viem/chains";

const ERC20_ABI = parseAbi([
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

const publicClient = createPublicClient({
  chain: base,
  transport: http(), // or http(process.env.NEXT_PUBLIC_BASE_RPC_URL!)
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address")?.trim();

    if (!address || !isAddress(address, { strict: false })) {
      return NextResponse.json(
        { ok: false, error: "Invalid or missing token address" },
        { status: 400 }
      );
    }

    const token = getContract({
      address: address as `0x${string}`,
      abi: ERC20_ABI,
      // viem v2-style client
      client: {
        public: publicClient,
      },
    });

    const [name, symbol, decimalsRaw] = await Promise.all([
      token.read.name().catch(() => ""),
      token.read.symbol().catch(() => ""),
      token.read.decimals().catch(() => 18),
    ]);

    const decimals = Number(decimalsRaw);

    return NextResponse.json({
      ok: true,
      address,
      name,
      symbol,
      decimals: Number.isFinite(decimals) ? decimals : 18,
    });
  } catch (err: any) {
    console.error("Token lookup error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Token lookup failed" },
      { status: 500 }
    );
  }
}
