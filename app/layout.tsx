// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";

// Keep metadata simple; complex logic belongs in pages
export const metadata: Metadata = {
  title: "TamaBot — On-Chain Farcaster Pet",
  description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        <Providers>
          {/* Fire Farcaster MiniApp ready() as soon as the app hydrates */}
          <AppReady />
          {/* Global navigation */}
          <Nav />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}
