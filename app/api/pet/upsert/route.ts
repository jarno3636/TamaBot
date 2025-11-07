// app/api/pet/upsert/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function supa() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_SECRET_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tokenId, imageCid, previewCid, persona } = body as {
      tokenId: number;
      imageCid?: string;
      previewCid?: string;
      persona?: { name?: string; label?: string; bio?: string } | null; // <-- name added
    };

    if (!tokenId || !Number.isFinite(tokenId)) {
      return NextResponse.json({ error: "tokenId required" }, { status: 400 });
    }

    const fields: any = {};
    if (imageCid != null) fields.current_image_cid = imageCid;
    if (previewCid != null) fields.preview_cid = previewCid;
    if (persona != null) {
      const p = {
        name: persona.name || "Tama",
        label: persona.label || "Auto",
        bio: persona.bio || "A cheerful bot tuned to your vibe.",
        source: "openai",
        created_at: new Date().toISOString(),
      };
      fields.persona = p;
    }

    const db = supa();
    const { error } = await db
      .from("pets")
      .upsert({ token_id: tokenId, ...fields }, { onConflict: "token_id" });

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
