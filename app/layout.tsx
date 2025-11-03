// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app";
const ABS = (p: string) => new URL(p, SITE).toString();

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "TamaBot",
  description: "On-chain Farcaster pet on Base",
  alternates: { canonical: SITE },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    title: "TamaBot — Farcaster Pet on Base",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    url: SITE,
    siteName: "TamaBot",
    images: [{ url: ABS("/og.png"), width: 1200, height: 630, alt: "TamaBot preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TamaBot",
    description: "On-chain Farcaster pet on Base",
    images: [ABS("/og.png")],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
  themeColor: "#0a0b10",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  other: {
    // ✅ Farcaster Frame metadata (kept simple; your /api/frame can expand if needed)
    "fc:frame": "vNext",
    "fc:frame:image": ABS("/og.png"),
    "fc:frame:button:1": "Open TamaBot",
    "fc:frame:button:1:action": "post",

    // Some parsers still read this directly:
    "og:image": ABS("/og.png"),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Farcaster Mini App embed – enables “Open in Warpcast” mini-app launch UI
  const miniAppEmbed = {
    version: "1",
    imageUrl: ABS("/og.png"),
    button: {
      title: "Open TamaBot",
      action: {
        type: "launch_frame",
        name: "TamaBot",
        url: ABS("/"),
        splashImageUrl: ABS("/apple-touch-icon.png"),
        splashBackgroundColor: "#0a0b10",
      },
    },
  };

  return (
    <html lang="en">
      <head>
        {/* Farcaster / Base MiniKit (safe no-op on web) */}
        <script src="https://cdn.jsdelivr.net/npm/@farcaster/mini-kit/dist/minikit.js" async />

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* ✅ Warpcast Mini App embed */}
        <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />

        {/* iOS PWA niceties */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />
      </head>

      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
