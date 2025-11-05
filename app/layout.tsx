// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/providers";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "TamaBot — On-Chain Farcaster Pet",
  description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
