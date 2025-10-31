// app/api/subscribe/route.ts
import { NextRequest } from "next/server";

/**
 * Minimal subscribe endpoint.
 * Expects JSON: { fid: number }
 * Uses NEYNAR_API_URL + NEYNAR_API_KEY + NEYNAR_CHANNEL_ID (env).
 * You can swap to Warpcast's Channel Subscribe API if preferred.
 */
export async function POST(req: NextRequest) {
  try {
    const { fid } = await req.json();
    if (!fid) return new Response("Missing fid", { status: 400 });

    const api = process.env.NEYNAR_API_URL || "https://api.neynar.com/v2";
    const key = process.env.NEYNAR_API_KEY!;
    const channelId = process.env.NEYNAR_CHANNEL_ID!; // e.g. "tamabot"
    if (!key || !channelId) return new Response("Server not configured", { status: 500 });

    // NOTE: Replace this path/body with your actual provider’s subscribe/follow call.
    const r = await fetch(`${api}/channel/subscribe`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api_key": key
      },
      body: JSON.stringify({ channel_id: channelId, fid })
    });

    if (!r.ok) {
      const txt = await r.text();
      return new Response(`Subscribe failed: ${txt}`, { status: 500 });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  } catch (e: any) {
    return new Response(`Error: ${e?.message || e}`, { status: 500 });
  }
}
