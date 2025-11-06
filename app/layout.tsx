import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

// Keep metadata simple; complex logic belongs in pages
export const metadata: Metadata = {
  title: "TamaBot — On-Chain Farcaster Pet",
  description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        <Providers>
          {/* 👇 ensure the ready-signal fires immediately after hydration */}
          {typeof window !== "undefined" ? null : null}
          {/* AppReady is a client component; import it here */}
          {/* We load it via a client boundary inside Providers (which is client) */}
          <AppReadyMount />
          {children}
        </Providers>
      </body>
    </html>
  );
}

/**
 * Small client-only wrapper so we can call a client component
 * from a server layout without dynamic import flags.
 */
function AppReadyMount() {
  // This file is a server component, so we inline a client child:
  // Create this tiny component at the bottom to avoid ssr:false dynamic import errors.
  return <AppReadyClient />;
}

// ====== client child ======
import AppReady from "@/components/AppReady";
function AppReadyClient() {
  "use client";
  return <AppReady />;
}
