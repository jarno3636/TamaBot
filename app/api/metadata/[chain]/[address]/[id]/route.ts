// app/api/metadata/[chain]/[address]/[id]/route.ts
import { NextRequest } from "next/server";
import { getOnchainState, getPersona, getSpriteCid, hasSupabase } from "@/lib/data";
import { ipfsToHttp } from "@/lib/ipfs"; // <-- you already have this helper

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  { params }: { params: { chain: string; address: string; id: string } }
) {
  const { address, id } = params;

  // On-chain state
  const s = await getOnchainState(address, Number(id));

  // Optional DB lookups
  const persona   = hasSupabase() ? await getPersona(Number(id)) : null;
  const spriteCid = hasSupabase() ? await getSpriteCid(Number(id)) : "";

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  // ensure absolute https assets for embeds
  const imageHttp = spriteCid ? ipfsToHttp(spriteCid) : "";
  const animHttp  = persona?.previewCid ? ipfsToHttp(persona.previewCid) : "";

  const json = {
    name: `TamaBot #${id}`,
    description: persona?.bio ?? "An AI-shaped Farcaster pet that evolves with your vibe.",
    image: imageHttp,
    animation_url: animHttp,
    attributes: [
      { trait_type: "Level", value: s.level },
      { trait_type: "Mood", value: s.mood },
      { trait_type: "Hunger", value: s.hunger },
      { trait_type: "Energy", value: s.energy },
      { trait_type: "Cleanliness", value: s.cleanliness },
      { trait_type: "FID", value: s.fid },
      { trait_type: "Personality", value: persona?.label ?? "Unknown" },
    ],
    external_url: site ? `${site}/tamabot/${id}` : undefined,
  };

  return new Response(JSON.stringify(json), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
