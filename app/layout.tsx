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
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/@farcaster/mini-kit/dist/minikit.js" async />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-[#0a0b10] text-white antialiased">
        <Providers>
          <Nav />
          <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
