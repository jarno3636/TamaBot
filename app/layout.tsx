// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";

/** ================================
 *  🛸 Basebots — Layout
 *  Global wrapper: nav, providers, styling
 *  ================================= */
export const metadata: Metadata = {
  title: "Basebots — On-Chain AI Companions",
  description:
    "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain SVGs from the neon future.",
  themeColor: "#0a0b12",
  icons: {
    icon: "/favicon.ico",
  },
};

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
        {/* Accessibility: skip link for keyboard users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>

        {/* React Query / Wagmi / RainbowKit / OnchainKit Providers */}
        <Providers>
          {/* MiniKit ready event for Farcaster */}
          <AppReady />

          {/* Global navigation bar */}
          <header role="banner">
            <Nav />
          </header>

          {/* Main content area */}
          <main id="main" role="main">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
