// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";
import MiniDebug from "@/components/MiniDebug"; // debug badge
import AppReady from "@/components/AppReady";   // <-- client-side ready pings

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
    "fc:frame": "vNext",
    "fc:frame:image": ABS("/og.png"),
    "fc:frame:button:1": "Open TamaBot",
    "fc:frame:button:1:action": "post",
    "og:image": ABS("/og.png"),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Warpcast Mini App embed (enables “Open in Warpcast” launch UI)
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
        {/* ✅ Official Farcaster Mini App SDK (v2) */}
        <script async src="https://cdn.farcaster.xyz/sdk/miniapp/v2.js"></script>

        {/* (Optional) Coinbase/Base MiniKit – harmless on web */}
        <script async src="https://cdn.jsdelivr.net/npm/@farcaster/mini-kit/dist/minikit.js"></script>

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Warpcast Mini App embed */}
        <meta name="fc:miniapp" content={JSON.stringify(miniAppEmbed)} />

        {/* iOS PWA niceties */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="format-detection" content="telephone=no" />

        {/* Ultra-early “ready” pings (covers multiple host shapes) */}
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
    attempts++; if (attempts >= maxAttempts) { done = true; try{ clearInterval(iv); }catch(_){} }
  }
  var iv = setInterval(ping, 150);
  ping();
  document.addEventListener('DOMContentLoaded', ping, { once: true });
  window.addEventListener('pageshow', ping);
  window.addEventListener('focus', ping);
})();
`}}
        />
      </head>

      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        {/* Client helper that also pings ready() a bit after hydration */}
        <AppReady />

        <Providers>
          <Nav />
          {/* Avoid returning another <main> from pages to prevent nested mains */}
          <main className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</main>
        </Providers>

        {/* Debug badge (renders only when NEXT_PUBLIC_MINI_DEBUG=true) */}
        <MiniDebug />
      </body>
    </html>
  );
}
