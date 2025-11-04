// Example: server route fetching a user's feed with Neynar
// app/api/feed/[fid]/route.ts
import { NextResponse } from "next/server";
export async function GET(_: Request, { params }: { params: { fid: string } }) {
  const key = process.env.NEYNAR_API_KEY!;
  const url = "https://api.neynar.com/v2/farcaster/feed";
  const r = await fetch(`${url}?fid=${Number(params.fid)}`, { headers: { api_key: key } });
  return new NextResponse(await r.text(), { headers: { "content-type": "application/json" } });
}
