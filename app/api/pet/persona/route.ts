// app/api/pet/persona/route.ts
import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function supa() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Supabase env missing");
  return createClient(url, key, { auth: { persistSession: false } });
}

type InBody =
  | { id?: number; text?: string } // legacy
  | { id?: number; name?: string; label?: string; bio?: string }; // new

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InBody;
    const id = Number((body as any).id || 0);
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    // Normalize into { name, label, bio }
    let name = (body as any).name?.toString().trim();
    let label = (body as any).label?.toString().trim();
    let bio = (body as any).bio?.toString().trim();

    if (!name && !label && !bio && (body as any).text) {
      // Back-compat: try to parse legacy 'text' as JSON first, else treat as bio
      const raw = String((body as any).text);
      try {
        const j = JSON.parse(raw);
        name = j.name ? String(j.name) : undefined;
        label = j.label ? String(j.label) : undefined;
        bio = j.bio ? String(j.bio) : undefined;
      } catch {
        bio = raw;
      }
    }

    // Sensible defaults
    name = name || "Tama";
    label = label || "Auto";
    bio = bio || "A cheerful bot tuned to your vibe.";

    const persona = {
      name,
      label,
      bio,
      source: "openai",
      created_at: new Date().toISOString(),
    };

    const db = supa();
    const { error } = await db
      .from("pets")
      .upsert(
        {
          token_id: id,
          persona,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "token_id" }
      );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
