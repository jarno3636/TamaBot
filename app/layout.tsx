// app/layout.tsx
import "./globals.css";
import Providers from "./providers";
import Nav from "@/components/Nav";

export const metadata = {
  title: "TamaBot",
  description: "On-chain Farcaster pet on Base",
  openGraph: {
    title: "TamaBot — Farcaster Pet on Base",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app",
    images: [{ url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app"}/og.png`, width: 1200, height: 630, alt: "TamaBot preview" }],
    siteName: "TamaBot"
  },
  twitter: { card: "summary_large_image", title: "TamaBot", description: "On-chain Farcaster pet on Base", images: [`${process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app"}/og.png`] }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="https://cdn.jsdelivr.net/npm/@farcaster/mini-kit/dist/minikit.js" async />
        <link rel="icon" href="/favicon.ico" />
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
