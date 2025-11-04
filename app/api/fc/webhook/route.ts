// app/api/fc/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supa = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  : null;

/*
  Expect payloads like:
  {
    "type": "notifications.enabled" | "notifications.disabled",
    "user": { "fid": 12345 },
    "clientId": "warpcast" | "base",
    "notificationUrl": "https://...",
    "token": "signed-token-string"
  }
*/
export async function POST(req: NextRequest) {
  try {
    if (!supa) return new NextResponse("DB not configured", { status: 500 });
    const body = await req.json();
    const type = String(body?.type || "");
    const fid = Number(body?.user?.fid);
    const clientId = String(body?.clientId || "");
    const url = String(body?.notificationUrl || "");
    const token = String(body?.token || "");

    if (!Number.isFinite(fid) || fid <= 0) return new NextResponse("bad fid", { status: 400 });

    if (type === "notifications.enabled" && url && token) {
      await supa.from("fc_notifications").upsert(
        { fid, client_id: clientId, url, token },
        { onConflict: "fid,client_id" }
      );
    } else if (type === "notifications.disabled") {
      await supa.from("fc_notifications").delete().eq("fid", fid).eq("client_id", clientId);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message || "bad request", { status: 400 });
  }
}
