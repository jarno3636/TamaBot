// app/layout.tsx
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app";

export const metadata = {
  title: "TamaBot",
  description: "On-chain Farcaster pet on Base",
  openGraph: {
    title: "TamaBot — Farcaster Pet on Base",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    url: SITE,
    images: [{ url: `${SITE}/og.png`, width: 1200, height: 630, alt: "TamaBot preview" }],
    siteName: "TamaBot",
  },
  twitter: {
    card: "summary_large_image",
    title: "TamaBot",
    description: "On-chain Farcaster pet on Base",
    images: [`${SITE}/og.png`],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
} as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Farcaster Mini App embed config (lightweight)
  const miniAppEmbed = {
    version: "1",
    imageUrl: `${SITE}/og.png`,
    button: {
      title: "Open TamaBot",
      action: {
        type: "launch_frame",
        name: "TamaBot",
        url: `${SITE}/`,
        splashImageUrl: `${SITE}/apple-touch-icon.png`,
        splashBackgroundColor: "#0a0b10",
      },
    },
  };

  return (
    <html lang="en">
      <head>
        {/* Farcaster / Base MiniKit (no-op on web) */}
        <script src="https://cdn.jsdelivr.net/npm/@farcaster/mini-kit/dist/minikit.js" async />

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Farcaster Mini App meta (helps rich embed in Warpcast) */}
        <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />
      </head>

      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        <Providers>
          {/* Global nav (single source of truth) */}
          <Nav />

          {/* Page content */}
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
