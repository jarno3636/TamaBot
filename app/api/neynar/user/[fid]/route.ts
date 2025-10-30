// app/api/neynar/user/[fid]/route.ts
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(_req: NextRequest, { params }: { params: { fid: string }}) {
  const key = process.env.NEYNAR_API_KEY!;
  if (!key) return new Response(JSON.stringify({ error: "missing key" }), { status: 500 });

  const fid = Number(params.fid);
  if (!Number.isFinite(fid) || fid <= 0) return new Response(JSON.stringify({ error: "bad fid" }), { status: 400 });

  // v2 user by fid
  const r = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
    headers: { "api_key": key }
  });

  const j = await r.json();
  return new Response(JSON.stringify(j), { headers: { "content-type": "application/json" } });
}
