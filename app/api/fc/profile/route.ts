// app/api/fc/profile/route.ts
import { NextRequest, NextResponse } from "next/server";

const NEYNAR = process.env.NEYNAR_API_KEY || "";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const fid = url.searchParams.get("fid");
    if (!fid || !/^\d+$/.test(fid)) {
      return NextResponse.json({ ok: false, error: "Missing or invalid fid" }, { status: 400 });
    }
    if (!NEYNAR) {
      return NextResponse.json({ ok: false, error: "Server missing NEYNAR_API_KEY" }, { status: 500 });
    }

    // Primary endpoint
    let profile: any | null = null;
    let res = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
      headers: { "api_key": NEYNAR },
      // Tiny cache to keep this snappy without staleness being a problem
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const j = await res.json().catch(() => ({}));
      profile = j?.user ?? null;
    }

    // Fallback to bulk if needed
    if (!profile) {
      res = await fetch(`https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`, {
        headers: { "api_key": NEYNAR },
        next: { revalidate: 60 },
      });
      if (res.ok) {
        const j = await res.json().catch(() => ({}));
        profile = Array.isArray(j?.users) ? j.users[0] : null;
      }
    }

    if (!profile) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // Normalize a few fields
    const fn = (x: any, ...paths: string[]) =>
      paths.reduce((acc: any, k: string) => (acc && acc[k] !== undefined ? acc[k] : null), x);

    const pfpUrl =
      fn(profile, "pfp_url") ??
      fn(profile, "pfp", "url") ??
      null;

    const displayName =
      fn(profile, "display_name") ??
      fn(profile, "profile", "display_name") ??
      fn(profile, "displayName") ??
      null;

    const username =
      fn(profile, "username") ??
      fn(profile, "profile", "username") ??
      null;

    return NextResponse.json({
      ok: true,
      fid: Number(fid),
      profile: {
        pfpUrl,
        displayName,
        username,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
