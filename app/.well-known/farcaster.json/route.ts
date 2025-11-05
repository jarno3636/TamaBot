// app/.well-known/farcaster.json/route.ts
import { NextResponse } from "next/server";
import { getFarcasterManifest } from "@/lib/warpcast";

export const dynamic = "force-static";

export async function GET() {
  const manifest = await getFarcasterManifest();
  return NextResponse.json(manifest, { status: 200 });
}
