// app/api/metadata/[chain]/[address]/[id]/route.ts
import { getOnchainState, getPersona, getSpriteCid, hasSupabase } from "@/lib/data";
import { ipfsToHttp } from "@/lib/ipfs";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * We intentionally keep `context: any` to satisfy Next 15's handler checks.
 */
export async function GET(req: Request, context: any) {
  try {
    const { params } = context || {};
    const chain = String(params?.chain || "").toLowerCase();
    const address = String(params?.address || "").toLowerCase();

    // Accept `/1`, `/1.json`, `/1/` — grab the first integer
    const rawId = String(params?.id ?? "");
    const idMatch = rawId.match(/\d+/);
    const idNum = idMatch ? Number(idMatch[0]) : NaN;

    // ---------- validate ----------
    if (!Number.isFinite(idNum) || idNum < 0) {
      return json({ error: "Invalid token id" }, 400);
    }
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return json({ error: "Invalid address" }, 400);
    }

    // ---------- site + fallbacks ----------
    const envSite = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const url = new URL(req.url);
    const site = envSite || `${url.protocol}//${url.host}`;
    const fallbackImage = `${site}/og.png`; // put /public/og.png in your repo

    // ---------- on-chain ----------
    let s: Awaited<ReturnType<typeof getOnchainState>>;
    try {
      s = await getOnchainState(address as `0x${string}`, idNum);
    } catch (e: any) {
      return json(
        {
          error: "getOnchainState failed",
          details: { message: e?.message || String(e), address, id: idNum },
        },
        502
      );
    }

    // ---------- optional DB lookups ----------
    const useDb = hasSupabase();
    const [persona, spriteCid] = await Promise.all([
      useDb ? getPersona(idNum) : Promise.resolve(null),
      useDb ? getSpriteCid(idNum) : Promise.resolve(""),
    ]);

    // If PNG sprite exists, use it. Otherwise, keep a static placeholder image,
    // but expose the animated preview via `animation_url` (so marketplaces show motion).
    const hasPng = Boolean(spriteCid);
    const hasPreview = Boolean(persona?.previewCid);

    const imageHttp = hasPng ? ipfsToHttp(spriteCid) : fallbackImage;
    const animHttp  = hasPreview ? ipfsToHttp(persona!.previewCid!) : undefined;

    // ---------- payload ----------
    const payload = {
      name: `TamaBot #${idNum}`,
      description: persona?.bio ?? "An AI-shaped Farcaster pet that evolves with your vibe.",
      image: imageHttp,          // PNG if present; otherwise /og.png
      animation_url: animHttp,   // present when preview is available
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
      external_url: `${site}/tamabot/${idNum}`,
    };

    return json(payload, 200, {
      "cache-control": "public, max-age=0, s-maxage=300, stale-while-revalidate=600",
    });
  } catch (e: any) {
    return json({ error: "server_error", message: e?.message || "Unexpected error" }, 500);
  }
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
