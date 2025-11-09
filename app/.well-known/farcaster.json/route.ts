// app/.well-known/farcaster.json/route.ts
import { NextResponse, NextRequest } from "next/server";

export const dynamic = "force-static";
export const revalidate = 300;

// --- AccountAssociation blobs (from Warpcast > Settings > Developer > Domains)
const AA_BASEBOTS = {
  header:
    "eyJmaWQiOjE0MzQxNzEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhFNkMwQTQxMEI0QzcyMmI4NDdmNjE2Mjk4MTllM0Q2MjE1ODA2MENGIn0",
  payload: "eyJkb21haW4iOiJiYXNlYm90cy52ZXJjZWwuYXBwIn0",
  signature:
    "sUIN0qNFJyUlOupMZ/2rK8ejXiJDcrCCudjs8DUG5Bth0npnt9EoYw7NIKOy5oYY4tVdw+wAgai235FlDit5ths=",
};

const AA_TAMABOT = {
  header:
    "eyJmaWQiOjE0MzQxNzEsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhFNkMwQTQxMEI0QzcyMmI4NDdmNjE2Mjk4MTllM0Q2MjE1ODA2MENGIn0",
  payload: "eyJkb21haW4iOiJ0YW1hYm90LnZlcmNlbC5hcHAifQ",
  signature:
    "iHaWHbcVV0WGUEIHxMEjWJBlJXg495/ZMI3nS6R0xoR6xTO0HGKY0eTUu8/5/D6Rf/Rr3OJIfiRSlJIC1l7BRxw=",
};

export async function GET(req: NextRequest) {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "basebots.vercel.app";
  const origin = `https://${host}`;
  const isBasebots = /(^|\.)basebots\.vercel\.app$/i.test(host);

  // Pick the matching association and branding
  const aa = isBasebots ? AA_BASEBOTS : AA_TAMABOT;
  const brandName = isBasebots
    ? "Basebots — On-Chain Escorts from the Neon Future"
    : "TamaBot — On-Chain Farcaster Pet";
  const shortName = isBasebots ? "Basebots" : "TamaBot";
  const desc = isBasebots
    ? "Summon your Farcaster-linked Basebot. A little bit lives on-chain, and on the network."
    : "Adopt, evolve, and share your on-chain AI pet directly from Warpcast — powered by Base.";

  const manifest = {
    accountAssociation: aa,
    frame: {
      version: "1",
      name: brandName,
      iconUrl: `${origin}/icon.png`,
      homeUrl: `${origin}/`,
      imageUrl: `${origin}/og.png`,
      buttonTitle: isBasebots ? "Launch Basebots" : "Adopt Your TamaBot",
      splashImageUrl: `${origin}/splash.png`,
      splashBackgroundColor: "#0a0b10",
      webhookUrl: `${origin}/api/webhook`,
      // Optional metadata used by some Farcaster mini-app surfaces:
      description: desc,
      primaryCategory: "social",
      tags: isBasebots ? ["mini-app", "basebots", "base"] : ["mini-app", "tamabot", "base"],
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
