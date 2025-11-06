// app/api/metadata/[chain]/[address]/[id]/route.ts
import { getOnchainState, getPersona, getSpriteCid, hasSupabase } from "@/lib/data";
import { ipfsToHttp } from "@/lib/ipfs";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: any) {
  // --- normalize params ------------------------------------------------------
  const chain = String(params?.chain || "").toLowerCase();
  const address = String(params?.address || "").toLowerCase();

  // Accept `/1`, `/1.json`, `/1/` — grab the first integer you see
  const rawId = String(params?.id ?? "");
  const idMatch = rawId.match(/\d+/);
  const idNum = idMatch ? Number(idMatch[0]) : NaN;

  // --- validate --------------------------------------------------------------
  if (!Number.isFinite(idNum) || idNum < 0) {
    return json({ error: "Invalid token id" }, 400);
  }
  if (!/^0x[a-f0-9]{40}$/.test(address)) {
    return json({ error: "Invalid address" }, 400);
  }

  // --- data fetches ----------------------------------------------------------
  const s = await getOnchainState(address, idNum);

  // Optional DB lookups
  const persona   = hasSupabase() ? await getPersona(idNum)   : null;
  const spriteCid = hasSupabase() ? await getSpriteCid(idNum) : "";

  // Media + links
  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const imageHttp = spriteCid ? ipfsToHttp(spriteCid) : "";
  const animHttp  = persona?.previewCid ? ipfsToHttp(persona.previewCid) : "";

  // --- response --------------------------------------------------------------
  const payload = {
    name: `TamaBot #${idNum}`,
    description: persona?.bio ?? "An AI-shaped Farcaster pet that evolves with your vibe.",
    image: imageHttp || undefined,
    animation_url: animHttp || undefined,
    attributes: [
      { trait_type: "Level",       value: s.level },
      { trait_type: "Mood",        value: s.mood },
      { trait_type: "Hunger",      value: s.hunger },
      { trait_type: "Energy",      value: s.energy },
      { trait_type: "Cleanliness", value: s.cleanliness },
      { trait_type: "FID",         value: s.fid },
      { trait_type: "Personality", value: persona?.label ?? "Unknown" },
      { trait_type: "Chain",       value: chain },
      { trait_type: "Contract",    value: address },
    ],
  };

  // external_url optional (good for marketplaces)
  if (site) (payload as any).external_url = `${site}/tamabot/${idNum}`;

  return json(payload, 200, {
    "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
  });
}

/* ------------------------------ helpers ----------------------------------- */
function json(data: any, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...(extraHeaders || {}),
    },
  });
}
