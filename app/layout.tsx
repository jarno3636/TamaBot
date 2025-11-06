// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";

// Keep metadata simple; complex logic belongs in pages
export const metadata: Metadata = {
  title: "TamaBot — On-Chain Farcaster Pet",
  description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
  themeColor: "#0a0b10",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        {/* Accessible skip link for keyboard users */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:bg-white focus:text-black focus:px-3 focus:py-2 focus:rounded-lg"
        >
          Skip to content
        </a>

        <Providers>
          {/* Fire Farcaster MiniApp ready() as soon as the app hydrates */}
          <AppReady />

          {/* Global navigation (sticky header lives inside the component) */}
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
