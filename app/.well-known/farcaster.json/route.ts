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

// ✅ Add Base Build ownership so you can import/preview in Base Build
const BASE_BUILDER = {
  ownerAddress: "0x7fd97A417F64d2706cF5C93c8fdf493EdA42D25c",
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

  // ⚠️ Mini App manifest (new schema). Most surfaces now expect `miniapp`.
  const manifest = {
    accountAssociation: AA_BASEBOTS,
    baseBuilder: BASE_BUILDER,
    miniapp: {
      version: "1",
      name: brandName,                           // <= 32 chars
      homeUrl: `${origin}/`,
      iconUrl: `${origin}/icon.png`,
      splashImageUrl: `${origin}/splash.png`,
      splashBackgroundColor: "#0a0b10",
      webhookUrl: `${origin}/api/webhook`,

      // Optional but recommended metadata
      subtitle: "On-chain Bot Companion",
      description: desc,
      primaryCategory: "social",
      tags: ["miniapp", "basebots", "base"],
      screenshotUrls: [`${origin}/og.png`],
      heroImageUrl: `${origin}/og.png`,
      tagline: "Bring forth your Basebot",
      ogTitle: shortName,
      ogDescription: desc,
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
