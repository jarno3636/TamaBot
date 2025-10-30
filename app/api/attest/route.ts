// app/api/attest/route.ts
import { NextRequest } from "next/server";
import { createPublicClient, createWalletClient, http, Hex, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const ABI = parseAbi([
  "function updateFromAttestation(bytes payload, bytes sig) external",
]);

// Use your live Core address:
const CORE = "0x25f68f020e0c8db4b1b7e2d89477c324944a7d51" as const;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const { payload, sig } = await req.json() as { payload: Hex; sig: Hex };

    if (!payload || !sig) {
      return new Response(JSON.stringify({ error: "payload and sig required" }), { status: 400 });
    }

    const pk = process.env.ATTEST_RELAYER_KEY;
    const rpc = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
    if (!pk || !rpc) {
      return new Response(JSON.stringify({ error: "server missing ATTEST_RELAYER_KEY or RPC_URL" }), { status: 500 });
    }

    const account = privateKeyToAccount(pk as Hex);
    const transport = http(rpc);
    const publicClient = createPublicClient({ chain: base, transport });
    const walletClient = createWalletClient({ account, chain: base, transport });

    const hash = await walletClient.writeContract({
      address: CORE,
      abi: ABI,
      functionName: "updateFromAttestation",
      args: [payload, sig],
    });

    // Optionally wait for receipt:
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return new Response(JSON.stringify({ hash, status: receipt.status }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 });
  }
}
