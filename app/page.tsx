// app/page.tsx
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { env } from "@/lib/env";
import { buildTweetUrl, farcasterComposeUrl } from "@/lib/share";
import FarcasterLogin from "@/components/FarcasterLogin";
import SubscribeCallout from "@/components/SubscribeCallout";
import { useMiniApp } from "@/contexts/miniapp-context";

const appUrl = env.NEXT_PUBLIC_URL;

export async function generateMetadata(): Promise<Metadata> {
  const frame = {
    version: "next",
    imageUrl: `${appUrl}/og.png`,
    button: {
      title: "Launch TamaBot",
      action: {
        type: "launch_frame",
        name: "TamaBot",
        url: appUrl,
        splashImageUrl: `${appUrl}/apple-touch-icon.png`,
        splashBackgroundColor: "#0a0b10",
      },
    },
  };

  return {
    title: "TamaBot — On-Chain Farcaster Pet",
    description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
    openGraph: {
      title: "TamaBot — On-Chain Farcaster Pet",
      description: "Adopt, evolve, and share your on-chain AI pet directly from Warpcast.",
      url: appUrl,
      images: [`${appUrl}/og.png`],
    },
    other: {
      "fc:frame": JSON.stringify(frame),
    },
  };
}

export default function Home() {
  const { isFrameReady } = useMiniApp();

  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : appUrl;
  const shareUrl = `${base}/my`;
  const tweetURL = buildTweetUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl });
  const castURL = farcasterComposeUrl({ text: "Here’s my TamaBot 🐣", url: shareUrl });

  const mintPrice = (process.env.NEXT_PUBLIC_MINT_PRICE || "").trim();
  const maxSupply = (process.env.NEXT_PUBLIC_MAX_SUPPLY || "").trim();
  const priceLabel = mintPrice ? `Mint price: ${mintPrice}` : "Mint price: TBA";
  const supplyLabel = maxSupply ? `Supply: ${maxSupply}` : "Supply: TBA";

  return (
    <main className="min-h-[100svh] bg-[#0a0b10] text-white pb-16">
      <div className="container pt-6">
        {/* ===== HERO ===== */}
        <section className="grid gap-4">
          {/* Logo card */}
          <div className="glass glass-pad relative flex justify-center">
            <Image
              src="/logo.png"
              alt="TamaBot"
              width={200}
              height={200}
              className="object-contain"
              priority
            />
          </div>

          {/* Adopt card */}
          <div className="glass glass-pad">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Adopt your TamaBot</h1>
            <p className="mt-2 text-white/90 leading-relaxed">
              Your Farcaster-aware pet that grows with your vibe. Feed, play, clean, rest — then flex it.
            </p>

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="pill-note pill-note--green">Lives on Farcaster</span>
              <span className="pill-note pill-note--blue">Built from your Farcaster stats</span>
            </div>

            <div className="cta-row mt-4">
              <Link href="/mint" className="btn-pill btn-pill--orange">Mint your pet</Link>
              <Link href="/my"   className="btn-pill btn-pill--blue">See my pet</Link>
            </div>

            {isFrameReady && (
              <div className="mt-5 space-y-3">
                <FarcasterLogin />
                <SubscribeCallout />
              </div>
            )}
          </div>
        </section>

        {/* ===== SHARE & FACTS ===== */}
        <section className="grid gap-4 mt-8">
          <div className="glass glass-pad">
            <h2 className="text-xl font-bold mb-2">Share your TamaBot</h2>
            <p className="text-white/90 mb-4">
              Post your pet with rich preview art on Farcaster or X.
            </p>
            <div className="cta-row">
              <a href={castURL} className="btn-pill btn-pill--blue">Share on Farcaster</a>
              <a href={tweetURL} className="btn-pill btn-pill--yellow" target="_blank" rel="noreferrer">Share on X</a>
            </div>
            <p className="mt-3 text-sm text-white/75">
              Tip: we use your pet page’s Open Graph image for the embed.
            </p>
          </div>

          <div className="glass glass-pad">
            <h3 className="text-xl font-bold mb-3">Quick facts</h3>
            <ul className="flex flex-wrap gap-2">
              <li className="pill-note pill-note--blue">One pet per FID</li>
              <li className="pill-note pill-note--orange">Mint on Base</li>
              <li className="pill-note pill-note--green">Web & Mini App compatible</li>
              <li className="pill-note pill-note--yellow">{priceLabel}</li>
              <li className="pill-note pill-note--red">{supplyLabel}</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
