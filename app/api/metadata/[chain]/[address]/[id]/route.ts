import { NextRequest } from "next/server";
import { getOnchainState, getPersona, getSpriteCid } from "@/lib/data";

export async function GET(_req: NextRequest, { params }: { params: { chain: string, address: string, id: string }}) {
  const { chain, address, id } = params;
  const s = await getOnchainState(address, Number(id)); // via RPC
  const persona = await getPersona(Number(id));
  const imageCid = await getSpriteCid(Number(id)); // "ipfs://.../sprite.png"

  const json = {
    name: `TamaBot #${id}`,
    description: persona?.bio ?? "An AI-shaped Farcaster pet that evolves with your vibe.",
    image: imageCid,
    animation_url: persona?.previewCid ?? "",
    attributes: [
      { trait_type: "Level", value: s.level },
      { trait_type: "Mood", value: s.mood },
      { trait_type: "Hunger", value: s.hunger },
      { trait_type: "Energy", value: s.energy },
      { trait_type: "Cleanliness", value: s.cleanliness },
      { trait_type: "FID", value: s.fid },
      { trait_type: "Personality", value: persona?.label ?? "Unknown" },
    ],
    external_url: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || ""}/tamabot/${id}`,
  };

  return new Response(JSON.stringify(json), {
    headers: {
      "content-type": "application/json",
      "cache-control": "max-age=60, s-maxage=300, stale-while-revalidate=600",
    },
  });
}
