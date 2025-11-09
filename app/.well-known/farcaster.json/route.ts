import { NextRequest } from "next/server";

export const dynamic = "force-static";
export const revalidate = 300;

function pickHost(req: NextRequest) {
  return (
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    process.env.NEXT_PUBLIC_URL?.replace(/^https?:\/\//, "") ||
    "localhost:3000"
  );
}
function originFromHost(host: string) {
  const proto = process.env.NEXT_PUBLIC_URL?.startsWith("http://") ? "http" : "https";
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const host = pickHost(req);
  const origin = originFromHost(host);

  const homeUrl   = process.env.NEXT_PUBLIC_URL || origin;
  const iconUrl   = process.env.NEXT_PUBLIC_MINIAPP_ICON_URL   || `${origin}/icon.png`;
  const splashUrl = process.env.NEXT_PUBLIC_MINIAPP_SPLASH_URL || `${origin}/splash.png`;
  const heroUrl   = process.env.NEXT_PUBLIC_MINIAPP_HERO_URL   || `${origin}/og.png`;
  const ss1       = process.env.NEXT_PUBLIC_MINIAPP_SCREENSHOT_1 || `${origin}/og.png`;
  const ss2       = process.env.NEXT_PUBLIC_MINIAPP_SCREENSHOT_2 || `${origin}/og.png`;
  const ss3       = process.env.NEXT_PUBLIC_MINIAPP_SCREENSHOT_3 || `${origin}/og.png`;

  // Account association fields from Base Build (Account association tool)
  const accountAssociation = {
    header:    process.env.AA_HEADER    || "",
    payload:   process.env.AA_PAYLOAD   || "",
    signature: process.env.AA_SIGNATURE || "",
  };

  // <-- Added: baseBuilder with your ownerAddress
  const baseBuilder = {
    ownerAddress: "0x7fd97A417F64d2706cF5C93c8fdf493EdA42D25c",
  };

  const manifest = {
    accountAssociation,
    baseBuilder,
    miniapp: {
      version: "1",
      name: "Basebots — Based Couriers",
      homeUrl,
      iconUrl,
      splashImageUrl: splashUrl,
      splashBackgroundColor: "#0a0b12",
      webhookUrl: `${origin}/api/webhook`,
      subtitle: "Fast, fun, on-chain companions",
      description:
        "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
      screenshotUrls: [ss1, ss2, ss3],
      primaryCategory: "social",
      tags: ["basebots", "miniapp", "baseapp", "onchain"],
      heroImageUrl: heroUrl,
      tagline: "Bring forth your Basebot",
      ogTitle: "Basebots — Based Couriers",
      ogDescription:
        "Summon a chrome-cheeked courier from the Blue Tomorrow—right inside Base.",
      ogImageUrl: heroUrl,
      noindex: false,
    },
  };

  return Response.json(manifest, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, must-revalidate",
    },
  });
}
