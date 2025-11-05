// app/api/metadata/[chain]/[address]/[id]/route.ts
import { getOnchainState, getPersona, getSpriteCid, hasSupabase } from "@/lib/data";
import { ipfsToHttp } from "@/lib/ipfs";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

// looser + future-proof: use the web Request + a generic params record
export async function GET(
  _req: Request,
  ctx: { params: Record<string, string> }
) {
  const chain   = (ctx.params?.chain || "").toLowerCase();
  const address = (ctx.params?.address || "").toLowerCase();
  const idStr   = ctx.params?.id || "";

  // basic validation
  const idNum = Number(idStr);
  if (!Number.isFinite(idNum) || idNum < 0) {
    return new Response(JSON.stringify({ error: "Invalid token id" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
  if (!address || !/^0x[a-f0-9]{40}$/.test(address)) {
    return new Response(JSON.stringify({ error: "Invalid address" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // On-chain state (you can branch on `chain` if needed)
  const s = await getOnchainState(address, idNum);

  // Optional DB lookups
  const persona   = hasSupabase() ? await getPersona(idNum)   : null;
  const spriteCid = hasSupabase() ? await getSpriteCid(idNum) : "";

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

  const imageHttp = spriteCid ? ipfsToHttp(spriteCid) : "";
  const animHttp  = persona?.previewCid ? ipfsToHttp(persona.previewCid) : "";

  const json = {
    name: `TamaBot #${idNum}`,
    description: persona?.bio ?? "An AI-shaped Farcaster pet that evolves with your vibe.",
    image: imageHttp || undefined,
    animation_url: animHttp || undefined,
    attributes: [
      { trait_type: "Level",        value: s.level },
      { trait_type: "Mood",         value: s.mood },
      { trait_type: "Hunger",       value: s.hunger },
      { trait_type: "Energy",       value: s.energy },
      { trait_type: "Cleanliness",  value: s.cleanliness },
      { trait_type: "FID",          value: s.fid },
      { trait_type: "Personality",  value: persona?.label ?? "Unknown" },
      { trait_type: "Chain",        value: chain },
      { trait_type: "Contract",     value: address },
    ],
    external_url: site ? `${site}/tamabot/${idNum}` : undefined,
  };

  return new Response(JSON.stringify(json), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
