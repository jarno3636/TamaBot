// app/api/metadata/[chain]/[address]/[id]/route.ts
import { getOnchainState, getPersona, getSpriteCid, hasSupabase } from "@/lib/data";
import { ipfsToHttp } from "@/lib/ipfs";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET(req: Request, context: any) {
  try {
    const { params } = context || {};
    const url = new URL(req.url);
    const stub = url.searchParams.get("stub") === "1";

    const chain   = String(params?.chain || "").toLowerCase();
    const address = String(params?.address || "").toLowerCase();

    // Accept /1, /1.json, /1/
    const rawId   = String(params?.id ?? "");
    const idMatch = rawId.match(/\d+/);
    const idNum   = idMatch ? Number(idMatch[0]) : NaN;

    // Basic validation
    if (!Number.isFinite(idNum) || idNum < 0) {
      return json({ error: "Invalid token id", id: rawId }, 400);
    }
    if (!/^0x[a-f0-9]{40}$/.test(address)) {
      return json({ error: "Invalid address", address }, 400);
    }

    // --- Stub mode to confirm routing works even if backends fail -----------
    if (stub) {
      const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
      return json({
        name: `TamaBot #${idNum}`,
        description: "Stub metadata OK (routing works).",
        image: `${site}/og.png`,
        attributes: [
          { trait_type: "FID", value: 0 },
          { trait_type: "Chain", value: chain },
          { trait_type: "Contract", value: address },
        ],
        external_url: `${site}/tamabot/${idNum}`,
        _debug: "stub=1",
      });
    }

    // --- Real lookups (wrapped so any failure returns a useful error) -------
    let s: any;
    try {
      s = await getOnchainState(address, idNum);
    } catch (e: any) {
      return json({ error: "getOnchainState failed", details: safeErr(e), address, id: idNum }, 502);
    }

    let persona: any = null;
    let spriteCid = "";
    if (hasSupabase()) {
      try { persona = await getPersona(idNum); } catch (e: any) { /* soft fail */ }
      try { spriteCid = await getSpriteCid(idNum); } catch (e: any) { /* soft fail */ }
    }

    const site      = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const imageHttp = spriteCid ? ipfsToHttp(spriteCid) : "";
    const animHttp  = persona?.previewCid ? ipfsToHttp(persona.previewCid) : "";

    const payload = {
      name: `TamaBot #${idNum}`,
      description: persona?.bio ?? "An AI-shaped Farcaster pet that evolves with your vibe.",
      image: imageHttp || undefined,
      animation_url: animHttp || undefined,
      attributes: [
        { trait_type: "Level",       value: s?.level ?? 0 },
        { trait_type: "Mood",        value: s?.mood ?? 0 },
        { trait_type: "Hunger",      value: s?.hunger ?? 0 },
        { trait_type: "Energy",      value: s?.energy ?? 0 },
        { trait_type: "Cleanliness", value: s?.cleanliness ?? 0 },
        { trait_type: "FID",         value: s?.fid ?? 0 },
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
    // Final safety net
    return json({ error: "handler crashed", details: safeErr(e) }, 500);
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

function safeErr(e: any) {
  return typeof e === "object" ? { message: String(e?.message || e), name: e?.name } : String(e);
}
