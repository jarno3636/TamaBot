// app/layout.tsx
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";

/** ---- Dynamic metadata (absolute URLs + mini app embed) ---- */
export async function generateMetadata(): Promise<Metadata> {
  const origin = (process.env.NEXT_PUBLIC_URL || "https://basebots.vercel.app").replace(
    /\/$/,
    "",
  );
  const image = `${origin}/share.PNG?v=2`; // cache-buster
  const splashImageUrl = `${origin}/splash.png`;

  return {
    metadataBase: new URL(origin),
    title: "Basebots — On-Chain AI Companions",
    description:
      "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
    themeColor: "#0a0b12",
    icons: { icon: "/favicon.ico" },
    openGraph: {
      type: "website",
      url: origin,
      title: "Basebots — On-Chain AI Companions",
      description:
        "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
      images: [
        {
          url: image,
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
      images: [image],
    },
    other: {
      // Farcaster MiniApp embed
      "fc:miniapp": JSON.stringify({
        version: "next",
        imageUrl: image,
        button: {
          title: "Launch Basebots",
          action: {
            type: "launch_frame",
            name: "Basebots — Based Couriers",
            url: origin,
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
      <body className="min-h-screen bg-[#0a0b12] text-white antialiased">
        {/* Small legacy shim so weird in-app browsers don’t crash before React */}
        <Script id="legacy-env-shim" strategy="beforeInteractive">
          {`(function () {
            try {
              // globalThis shim
              if (typeof globalThis === 'undefined' && typeof window !== 'undefined') {
                window.globalThis = window;
              }
            } catch (_) {}

            if (typeof window !== 'undefined') {
              // process.env shim (some libs expect this to exist)
              if (typeof window.process === 'undefined') {
                window.process = { env: {} };
              } else if (typeof window.process.env === 'undefined') {
                window.process.env = {};
              }
            }
          })();`}
        </Script>

        <AppReady />

        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>

        <Providers>
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
        </Providers>
      </body>
    </html>
  );
}
