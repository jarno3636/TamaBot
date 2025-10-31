// app/mint/metadata.ts
import type { Metadata } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const og = `${base}/api/og/pet?title=Mint%20a%20TamaBot&subtitle=On%20Base`;

export const metadata: Metadata = {
  title: "Mint a TamaBot • TamaBots",
  description: "Mint your Farcaster-aware pet on Base.",
  openGraph: { title: "Mint a TamaBot • TamaBots", images: [og] },
  twitter: { card: "summary_large_image", images: [og] },
};
