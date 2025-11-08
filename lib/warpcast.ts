// lib/warpcast.ts
import { env } from "@/lib/env";

/**
 * Get the farcaster manifest for the frame, generate yours from Warpcast Mobile
 *  On your phone to Settings > Developer > Domains > insert website hostname > Generate domain manifest
 * @returns The farcaster manifest for the frame
 */
export async function getFarcasterManifest() {
  let frameName = "Basebots Mini-App";
  let noindex = false;
  const appUrl = env.NEXT_PUBLIC_URL || "";

  if (appUrl.includes("localhost")) {
    frameName += " Local";
    noindex = true;
  } else if (appUrl.includes("ngrok")) {
    frameName += " NGROK";
    noindex = true;
  } else if (appUrl.includes("https://dev.")) {
    frameName += " Dev";
    noindex = true;
  }

  return {
    accountAssociation: {
      // Safe fallbacks: empty strings are allowed; store listing can be added later
      header: env.NEXT_PUBLIC_FARCASTER_HEADER || "",
      payload: env.NEXT_PUBLIC_FARCASTER_PAYLOAD || "",
      signature: env.NEXT_PUBLIC_FARCASTER_SIGNATURE || "",
    },
    frame: {
      version: "1",
      name: frameName,
      iconUrl: `${appUrl}/images/icon.png`,
      homeUrl: appUrl,
      imageUrl: `${appUrl}/images/feed.png`,
      buttonTitle: `Launch App`,
      splashImageUrl: `${appUrl}/images/splash.png`,
      splashBackgroundColor: "#0a0b10",
      webhookUrl: `${appUrl}/api/webhook`,
      // Metadata https://github.com/farcasterxyz/miniapps/discussions/191
      subtitle: "On-chain robots from the future",
      description:
        "Mint a Basebot: on-chain SVG art, FID-anchored traits, and a neon-blue aesthetic built for Base.",
      primaryCategory: "social",
      tags: ["base", "nft", "on-chain", "mini-app"],
      tagline: "Forge your Basebot",
      ogTitle: `${frameName}`,
      ogDescription: "On-chain SVG robots with FID-bound traits.",
      screenshotUrls: [`${appUrl}/images/feed.png`],
      heroImageUrl: `${appUrl}/images/feed.png`,
      ogImageUrl: `${appUrl}/images/feed.png`,
      noindex,
    },
  };
}
