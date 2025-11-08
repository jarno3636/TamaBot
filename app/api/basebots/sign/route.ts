// app/api/basebots/sign/route.ts
import { NextResponse } from "next/server";
import { Address, Hex, createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";
import { privateKeyToAccount } from "viem/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ENV you need to set locally / on Vercel:
// PRIVATE_SIGNER_KEY = 0x........ (no quotes)
// (Optional) RPC_URL = https://base-mainnet.g.alchemy.com/v2/...
const SIGNER_KEY = process.env.PRIVATE_SIGNER_KEY as Hex | undefined;
if (!SIGNER_KEY) {
  console.warn("[/api/basebots/sign] Missing PRIVATE_SIGNER_KEY");
}

const client = createPublicClient({
  chain: base,
  transport: http(process.env.RPC_URL),
});

export async function POST(req: Request) {
  try {
    if (!SIGNER_KEY) throw new Error("Server not configured (missing PRIVATE_SIGNER_KEY).");
    const body = await req.json().catch(() => ({}));
    const to: Address = body?.to;
    const fid: bigint = BigInt(body?.fid ?? 0);
    const deadlineSecs: number = Number(body?.deadlineSecs ?? 60 * 10); // default 10 min

    if (!to) throw new Error("Missing 'to' address.");
    if (fid === 0n) throw new Error("Missing/invalid 'fid'.");

    // Always take on-chain mintPrice to avoid mismatches
    const mintPrice: bigint = await client.readContract({
      ...BASEBOTS,
      functionName: "mintPrice",
    });

    const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSecs);

    const account = privateKeyToAccount(SIGNER_KEY);

    // EIP-712 domain must match your contract (name, version, chainId, verifyingContract)
    const domain = {
      name: "Basebots",
      version: "1",
      chainId: 8453,
      verifyingContract: BASEBOTS.address as Address,
    } as const;

    const types = {
      Mint: [
        { name: "to", type: "address" },
        { name: "fid", type: "uint256" },
        { name: "price", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    } as const;

    const message = {
      to,
      fid,
      price: mintPrice,
      deadline,
    } as const;

    const signature = await account.signTypedData({ domain, types, primaryType: "Mint", message });

    return NextResponse.json({
      ok: true,
      verifier: account.address,
      to,
      fid: fid.toString(),
      price: mintPrice.toString(),
      deadline: deadline.toString(),
      sig: signature,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "sign failed" }, { status: 400 });
  }
}
