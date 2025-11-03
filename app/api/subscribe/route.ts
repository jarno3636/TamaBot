// app/api/subscribe/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supa = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

export async function POST(req: Request) {
  try {
    const { fid } = await req.json();
    const n = Number(fid);
    if (!Number.isFinite(n) || n <= 0) {
      return new NextResponse("Invalid fid", { status: 400 });
    }
    if (!supa) return new NextResponse("Supabase not configured", { status: 500 });

    const { error } = await supa.from("subscribers")
      .upsert({ fid: n }, { onConflict: "fid" });

    if (error) return new NextResponse(error.message, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "bad request", { status: 400 });
  }
}
