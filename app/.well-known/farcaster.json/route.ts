// app/.well-known/farcaster.json/route.ts
import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-static";
export const revalidate = 300;

// --- AccountAssociation blob for basebots.vercel.app
const AA_BASEBOTS = {
  header:
    "eyJmaWQiOjE0MzQxNzEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhFNkMwQTQxMEI0QzcyMmI4NDdmNjE2Mjk4MTllM0Q2MjE1ODA2MENGIn0",
  payload: "eyJkb21haW4iOiJiYXNlYm90cy52ZXJjZWwuYXBwIn0",
  signature:
    "sUIN0qNFJyUlOupMZ/2rK8ejXiJDcrCCudjs8DUG5Bth0npnt9EoYw7NIKOy5oYY4tVdw+wAgai235FlDit5ths=",
};

export async function GET(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "basebots.vercel.app";
  const origin = `https://${host}`;

  const brandName = "Basebots – Based Couriers";
  const shortName = "Basebots";
  const desc =
    "Summon your Farcaster-linked Basebot. A little bit lives on-chain, and on the network.";

  const manifest = {
    accountAssociation: AA_BASEBOTS,
    frame: {
      version: "1",
      name: brandName, // <= 32 chars
      iconUrl: `${origin}/icon.png`,
      homeUrl: `${origin}/`,
      imageUrl: `${origin}/og.png`,
      buttonTitle: "Launch Basebots",
      splashImageUrl: `${origin}/splash.png`,
      splashBackgroundColor: "#0a0b10",
      webhookUrl: `${origin}/api/webhook`,
      // Optional metadata for some Farcaster mini-app surfaces:
      description: desc,
      primaryCategory: "social",
      tags: ["mini-app", "basebots", "base"],
      ogTitle: shortName,
      ogDescription: desc,
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
