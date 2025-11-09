// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";
import BackgroundCubes from "@/components/BackgroundCubes";

/** ---- Static metadata (good for SEO & defaults) ---- */
export const metadata: Metadata = {
  title: "Basebots — On-Chain AI Companions",
  description:
    "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
  themeColor: "#0a0b12",
  icons: { icon: "/favicon.ico" },
  // Nice-to-have OpenGraph/Twitter defaults (override-able by generateMetadata)
  openGraph: {
    title: "Basebots — On-Chain AI Companions",
    description:
      "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
    images: ["/og.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Basebots — On-Chain AI Companions",
    description:
      "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
    images: ["/og.png"],
  },
};

/** ---- Mini App rich-embed metadata for Farcaster/Base ---- */
export async function generateMetadata(): Promise<Metadata> {
  const url = process.env.NEXT_PUBLIC_URL || "https://basebots.vercel.app";
  const image = `${url}/og.png`;
  const splashImageUrl = `${url}/splash.png`;

  return {
    // Add/override OpenGraph absolute URLs (helpful on custom domains)
    openGraph: {
      url,
      images: [image],
    },
    twitter: {
      images: [image],
    },
    // Farcaster Mini App embed
    other: {
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: image,
        button: {
          title: "Launch Basebots",
          action: {
            type: "launch_miniapp",
            name: "Basebots — Based Couriers",
            url,
            splashImageUrl,
            splashBackgroundColor: "#0a0b12",
          },
        },
      }),
    },
  };
}

/** ---- Viewport ---- */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0b12] text-white antialiased">
        {/* Background animation (not sticky; sits behind content) */}
        <BackgroundCubes className="-z-20" />

        {/* Accessibility: skip link */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>

        <Providers>
          {/* Announces readiness to Mini App host (safe on web) */}
          <AppReady />

          {/* Nav scrolls with the page per your CSS */}
          <header role="banner" className="nav-root z-[70]">
            <Nav />
          </header>

          <main id="main" role="main">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
