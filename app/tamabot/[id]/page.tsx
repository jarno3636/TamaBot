import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import PetCard from "@/components/PetCard";
import { CareButtons } from "@/components/CareButtons";

const rpc = createPublicClient({ chain: base, transport: http(process.env.NEXT_PUBLIC_RPC_URL) });

export default async function Page({ params }: { params: { id: string } }) {
  const tokenId = Number(params.id);
  const tokenUri = await rpc.readContract({
    address: TAMABOT_CORE.address,
    abi: TAMABOT_CORE.abi,
    functionName: "tokenURI",
    args: [BigInt(tokenId)],
  }) as string;

  return (
    <main className="max-w-3xl mx-auto p-6 grid gap-6">
      <PetCard tokenURI={tokenUri} />
      <CareButtons id={tokenId} />
    </main>
  );
}
