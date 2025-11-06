// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import AppReady from "@/components/AppReady";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app").replace(/\/$/, "");
const ABS = (p: string) => new URL(p, SITE).toString();

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "TamaBot — On-Chain Farcaster Pet",
  description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
  alternates: { canonical: SITE },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: "TamaBot — On-Chain Farcaster Pet",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    url: SITE,
    siteName: "TamaBot",
    images: [{ url: ABS("/og.png"), width: 1200, height: 630, alt: "TamaBot preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TamaBot — On-Chain Farcaster Pet",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    images: [ABS("/og.png")],
  },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  manifest: "/site.webmanifest",
  themeColor: "#0a0b10",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  other: {
    // Modern Mini App embed hints (read by hosts)
    "x-miniapp-name": "TamaBot — On-Chain Farcaster Pet",
    "x-miniapp-image": ABS("/og.png"),
    "x-miniapp-url": SITE,

    // Legacy frame-style hints (harmless for hosts that still read them)
    "fc:frame": "vNext",
    "fc:frame:image": ABS("/og.png"),
    "fc:frame:button:1": "Open TamaBot",
    "fc:frame:button:1:action": "post",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Official Farcaster Mini App SDK v2 */}
        <script async src="https://miniapps.farcaster.xyz/sdk/v2.js" />

        {/* Optional: Coinbase OnchainKit MiniKit UMD (safe no-op on web) */}
        <script async src="https://cdn.jsdelivr.net/npm/@farcaster/miniapp-sdk/dist/index.umd.js" />

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Tiny inline fallback to ping ready() very early */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  var tries=0, max=80, iv=setInterval(function(){
    try{ window.farcaster?.miniapp?.sdk?.actions?.ready?.(); }catch(e){}
    try{ window.farcaster?.actions?.ready?.(); }catch(e){}
    if(++tries>=max){ clearInterval(iv); }
  },150);
})();
`,
          }}
        />
      </head>

      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        {/* Early host-ready ping & context probe (no console required) */}
        <AppReady />

        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
