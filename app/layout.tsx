// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";
import BackgroundCubes from "@/components/BackgroundCubes";

export const metadata: Metadata = {
  title: "Basebots — On-Chain AI Companions",
  description:
    "Mint, evolve, and display your Farcaster-linked Basebot — fully on-chain from the neon future.",
  themeColor: "#0a0b12",
  icons: { icon: "/favicon.ico" },
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
        {/* Background animation (fixed, behind everything) */}
        <BackgroundCubes className="-z-20" />

        {/* Accessibility: skip link for keyboard users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>

        <Providers>
          <AppReady />

          {/* Nav above everything else */}
          <header role="banner" className="nav-root sticky top-0 z-[70]">
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
