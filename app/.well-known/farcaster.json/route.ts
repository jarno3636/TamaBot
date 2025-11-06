import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-static";
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "tamabot.vercel.app";
  const origin = `https://${host}`;

  const manifest = {
    accountAssociation: {
      header:
        "eyJmaWQiOjE0MzQxNzEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhFNkMwQTQxMEI0QzcyMmI4NDdmNjE2Mjk4MTllM0Q2MjE1ODA2MENGIn0",
      payload: "eyJkb21haW4iOiJ0YW1hYm90LnZlcmNlbC5hcHAifQ",
      signature:
        "iHaWHbcVV0WGUEIHxMEjWJBlJXg495/ZMI3nS6R0xoR6xTO0HGKY0eTUu8/5/D6Rf/Rr3OJIfiRSlJIC1l7BRxw=",
    },
    frame: {
      version: "1",
      name: "TamaBot — On-Chain Farcaster Pet",
      iconUrl: `${origin}/icon.png`,
      homeUrl: `${origin}/`,
      imageUrl: `${origin}/og.png`,
      buttonTitle: "Adopt Your TamaBot",
      splashImageUrl: `${origin}/splash.png`,
      splashBackgroundColor: "#0a0b10",
      webhookUrl: `${origin}/api/webhook`,
      description:
        "Adopt, evolve, and share your on-chain AI pet directly from Warpcast — powered by Base.",
      primaryCategory: "social",
      tags: ["mini-app", "tamabot", "base"],
      ogTitle: "TamaBot",
      ogDescription:
        "Adopt your Farcaster-aware pet that grows with your vibe.",
      screenshotUrls: [`${origin}/og.png`],
      heroImageUrl: `${origin}/og.png`,
      ogImageUrl: `${origin}/og.png`,
      noindex: false,
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, must-revalidate",
    },
  });
}
