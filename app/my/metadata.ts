// app/my/metadata.ts
import type { Metadata } from "next";

const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const og = `${base}/api/og/pet?title=My%20TamaBot&subtitle=Jump%20to%20your%20pet`;

export const metadata: Metadata = {
  title: "My TamaBot • TamaBots",
  description: "Jump straight to your TamaBot. Auto-detects FID in the Warpcast Mini.",
  openGraph: { title: "My TamaBot • TamaBots", images: [og] },
  twitter: { card: "summary_large_image", images: [og] },
};
