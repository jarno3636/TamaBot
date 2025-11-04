// app/api/fc/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
const db = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
  : null;

export async function POST(req: NextRequest) {
  // Farcaster client posts events here when a user enables/disables notifications
  const body = await req.json(); // contains event type + user fid + notificationUrl/token
  // Example shapes are in the spec; store per fid/client. 
  // { type: "notifications.enabled", user: { fid }, notificationUrl, token, clientId, ... }
  if (!db) return new NextResponse("DB not configured", { status: 500 });

  const { type, user, notificationUrl, token, clientId } = body || {};
  const fid = Number(user?.fid);

  if (type === "notifications.enabled" && fid && notificationUrl && token) {
    await db.from("fc_notifications").upsert({ fid, client_id: clientId, url: notificationUrl, token });
  }
  if (type === "notifications.disabled" && fid) {
    await db.from("fc_notifications").delete().eq("fid", fid).eq("client_id", clientId);
  }
  return NextResponse.json({ ok: true });
}
