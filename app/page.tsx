// app/page.tsx
import type { Metadata } from "next";
import { env } from "@/lib/env";
import NextDynamic from "next/dynamic"; // 👈 renamed to avoid collision

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

const appUrl = env.NEXT_PUBLIC_URL;

// Render the real home on the client to avoid SSR calling MiniKit / indexedDB
const HomeClient = NextDynamic(() => import("@/components/_HomeClient"), { ssr: false });

export async function generateMetadata(): Promise<Metadata> {
  const frame = {
    version: "next",
    imageUrl: `${appUrl}/og.png`,
    button: {
      title: "Launch TamaBot",
      action: {
        type: "launch_frame",
        name: "TamaBot",
        url: appUrl,
        splashImageUrl: `${appUrl}/apple-touch-icon.png`,
        splashBackgroundColor: "#0a0b10",
      },
    },
  };

  return {
    title: "TamaBot — On-Chain Farcaster Pet",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    openGraph: {
      title: "TamaBot — On-Chain Farcaster Pet",
      description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
      url: appUrl,
      images: [`${appUrl}/og.png`],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
