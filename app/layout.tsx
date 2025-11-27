// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";
import ErrorBoundary from "@/components/ErrorBoundary";

/** ---- Dynamic metadata (absolute URLs + mini app embed) ---- */
export async function generateMetadata(): Promise<Metadata> {
  const origin = (process.env.NEXT_PUBLIC_URL || "https://basebots.vercel.app").replace(
    /\/$/,
    "",
  );

  const ogImage = `${origin}/og.png`;
  const splashImageUrl = `${origin}/splash.png`;

  return {
    metadataBase: new URL(origin),
    title: "Basebots — On-Chain AI Companions",
    description:
      "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
    themeColor: "#0a0b12",
    icons: {
      icon: [
        { url: "/favicon.ico" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: "/icon-192.png",
    },
    openGraph: {
      type: "website",
      url: origin,
      title: "Basebots — On-Chain AI Companions",
      description:
        "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: "BASEBOTS — Mint Yours Today",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Basebots — On-Chain AI Companions",
      description:
        "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
      images: [ogImage],
    },
    other: {
      // Farcaster MiniApp embed
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: ogImage,
        button: {
          title: "Launch Basebots",
          action: {
            type: "launch_frame",
            name: "Basebots — Based Couriers",
            url: origin, // or `${origin}/mini` if you add a /mini entry
            splashImageUrl,
            splashBackgroundColor: "#0a0b12",
          },
        },
      }),
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0b12",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen text-white antialiased">
        <AppReady />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>

        <Providers>
          <ErrorBoundary>
            {/* Safe-area wrapper so Base's top overlay doesn't fight the nav */}
            <div
              className="min-h-screen flex flex-col"
              style={{ paddingTop: "env(safe-area-inset-top)" }}
            >
              <header role="banner" className="nav-root z-[70]">
                <Nav />
              </header>

              <main id="main" role="main" className="flex-1">
                {children}
              </main>
            </div>
          </ErrorBoundary>
        </Providers>
      </body>
    </html>
  );
}
