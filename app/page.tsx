import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "TamaBot — On-Chain Farcaster Pet",
  description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
};

export default function Page() {
  // Render client-only home so no server tries to read MiniKit / indexedDB
  return <HomeClient />;
}

// dynamic import isn't allowed with ssr:false in server files on Next 15,
// so we just import a client component directly here:
import HomeClient from "@/components/HomeClient";
