// app/.well-known/farcaster.json/route.ts
import { NextResponse } from "next/server";

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

// ✅ Base Build ownership – must use allowedAddresses[]
const BASE_BUILDER = {
  allowedAddresses: ["0x7fd97A417F64d2706cF5C93c8fdf493EdA42D25c"],
};

// Static origin for this route
const ORIGIN = (
  process.env.NEXT_PUBLIC_URL || "https://basebots.vercel.app"
).replace(/\/$/, "");

export async function GET() {
  const origin = ORIGIN;

  const brandName = "Basebots – Based Couriers";
  const shortName = "Basebots";
  const desc =
    "Summon your Farcaster-linked Basebot. A little bit lives on-chain, and on the network.";

  const image = `${origin}/og.png`;
  const icon = `${origin}/icon.png`;
  const splash = `${origin}/splash.png`;

  const COMMON = {
    version: "1",
    name: brandName,
    // Entry point: root of the app ("/")
    homeUrl: origin,
    iconUrl: icon,
    splashImageUrl: splash,
    splashBackgroundColor: "#0a0b12",

    subtitle: "On-chain Bot Companion",
    description: desc,
    primaryCategory: "social",
    tags: ["miniapp", "basebots", "base"],
    screenshotUrls: [image],
    heroImageUrl: image,
    tagline: "Bring forth your Basebot",
    ogTitle: shortName,
    ogDescription: desc,
    ogImageUrl: image,
    noindex: false,
  };

  const manifest = {
    accountAssociation: AA_BASEBOTS,
    baseBuilder: BASE_BUILDER,
    miniapp: COMMON,
    frame: COMMON,
  };

  return NextResponse.json(manifest, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=300, must-revalidate",
    },
  });
}
