// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import MiniDebug from "@/components/MiniDebug";
import AppReady from "@/components/AppReady";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app";
const ABS = (p: string) => new URL(p, SITE).toString();

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "TamaBot",
  description: "On-chain Farcaster pet on Base",
  alternates: { canonical: SITE },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true } },
  openGraph: {
    title: "TamaBot — Farcaster Pet on Base",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    url: SITE,
    siteName: "TamaBot",
    images: [{ url: ABS("/og.png"), width: 1200, height: 630, alt: "TamaBot preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TamaBot",
    description: "On-chain Farcaster pet on Base",
    images: [ABS("/og.png")],
  },
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  manifest: "/site.webmanifest",
  themeColor: "#0a0b10",
  viewport: "width=device-width, initial-scale=1, viewport-fit=cover",
  other: {
    // ✅ Farcaster Mini App (static in HTML)
    "x-miniapp-name": "TamaBot — On-Chain Farcaster Pet",
    "x-miniapp-image": ABS("/og.png"),
    "x-miniapp-url": SITE,

    // ✅ Frame meta (keep)
    "fc:frame": "vNext",
    "fc:frame:image": ABS("/og.png"),
    "fc:frame:button:1": "Open TamaBot",
    "fc:frame:button:1:action": "post",

    // Some parsers still read this:
    "og:image": ABS("/og.png"),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Legacy miniapp embed (harmless; some clients still read it)
  const miniAppEmbed = {
    version: "1",
    imageUrl: ABS("/og.png"),
    button: {
      title: "Open TamaBot",
      action: {
        type: "launch_frame",
        name: "TamaBot",
        url: ABS("/"),
        splashImageUrl: ABS("/apple-touch-icon.png"),
        splashBackgroundColor: "#0a0b10",
      },
    },
  };

  return (
    <html lang="en">
      <head>
        {/* ✅ Official Farcaster Mini App SDK */}
        <script async src="https://miniapps.farcaster.xyz/sdk/v2.js"></script>

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Legacy embed meta (safe to keep) */}
        <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />

        {/* iOS PWA niceties */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />

        {/* Early ready pings (covers multiple host shapes) */}
        <script
          id="fc-miniapp-ready"
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  if (window.__fcReadyInjected) return; window.__fcReadyInjected = true;
  var attempts = 0, maxAttempts = 50, done = false;
  function ping(){
    if (done) return;
    try { window.farcaster?.actions?.ready?.(); } catch(e){}
    try { window.farcaster?.miniapp?.sdk?.actions?.ready?.(); } catch(e){}
    try { window.Farcaster?.mini?.sdk?.actions?.ready?.(); } catch(e){}
    attempts++; if (attempts >= maxAttempts) { try{ clearInterval(iv); }catch(_){} done = true; }
  }
  var iv = setInterval(ping, 150);
  ping();
  document.addEventListener('DOMContentLoaded', ping, { once: true });
  window.addEventListener('pageshow', ping);
  window.addEventListener('focus', ping);
})();
          `,
          }}
        />
      </head>

      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        {/* Client “ready” after React mounts */}
        <AppReady />

        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </Providers>

        {/* Debug badge (respects NEXT_PUBLIC_MINI_DEBUG) */}
        <MiniDebug />
      </body>
    </html>
  );
}
