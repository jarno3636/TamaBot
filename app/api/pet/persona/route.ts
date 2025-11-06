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

export async function POST(req: NextRequest) {
  try {
    const { id, text } = (await req.json()) as { id?: number; text?: string };
    if (!id || !text) {
      return NextResponse.json({ error: "id and text required" }, { status: 400 });
    }

    const persona = {
      label: "Auto",
      bio: text,
      source: "openai",
      created_at: new Date().toISOString(),
    };

    const db = supa();

    // Upsert into pets table (by token_id). Adjust if your PK differs.
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
