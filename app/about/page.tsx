// app/about/page.tsx
import Link from "next/link";
import { TAMABOT_CORE } from "@/lib/abi";

// Optional page-specific metadata (safe here because this is NOT a client component)
export const metadata = {
  title: "About • TamaBots",
  description:
    "How TamaBots work: minting, on-chain stats, care actions, and Farcaster-aware previews.",
  openGraph: {
    title: "About • TamaBots",
    description:
      "How TamaBots work: minting, on-chain stats, care actions, and Farcaster-aware previews.",
    images: ["/og.png"],
  },
  twitter: { card: "summary_large_image" },
};

function envLabel(name: string, fallback: string) {
  const v = process.env[name];
  return (typeof v === "string" && v.trim().length > 0) ? v.trim() : fallback;
}

const MINT_PRICE = envLabel("NEXT_PUBLIC_MINT_PRICE", "TBA");
const MAX_SUPPLY = envLabel("NEXT_PUBLIC_MAX_SUPPLY", "TBA");
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app").replace(/\/$/, "");
const CONTRACT = TAMABOT_CORE.address as `0x${string}`;
const BASESCAN = `https://basescan.org/address/${CONTRACT}`;

export default function AboutPage() {
  return (
    <main className="min-h-[100svh] bg-deep-orange pb-16">
      <section className="stack">

        {/* Intro */}
        <div className="glass glass-pad">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            About TamaBots
          </h1>
          <p className="mt-2 text-white/90 leading-relaxed">
            TamaBots are <b>on-chain, Farcaster-aware pets</b>. Your activity and care
            actions shape each pet’s vibe—then you can flex it with rich embeds on Farcaster and X.
          </p>

          <div className="pill-row mt-4">
            <span className="pill-note pill-note--green">Lives on Farcaster</span>
            <span className="pill-note pill-note--blue">On-chain metadata</span>
            <span className="pill-note pill-note--orange">Mint on Base</span>
            <span className="pill-note pill-note--yellow">OG previews built-in</span>
          </div>

          <div className="cta-row">
            <Link href="/mint" className="btn-pill btn-pill--orange">Mint a TamaBot</Link>
            <Link href="/my" className="btn-pill btn-pill--blue">See my pet</Link>
          </div>
        </div>

        {/* How minting works */}
        <div className="glass glass-pad">
          <h2 className="text-xl font-bold">Minting & Supply</h2>
          <ul className="pill-row mt-3 text-white/90">
            <li className="pill-note pill-note--yellow text-[0.95rem]">Mint price: {MINT_PRICE}</li>
            <li className="pill-note pill-note--red text-[0.95rem]">Max supply: {MAX_SUPPLY}</li>
            <li className="pill-note pill-note--blue text-[0.95rem]">One pet per Farcaster FID</li>
          </ul>
          <p className="mt-3 text-white/85">
            Connect your wallet, enter your <b>FID</b>, and mint. If you’re inside the Warpcast Mini,
            we auto-detect your FID to make it seamless.
          </p>
        </div>

        {/* Contract details */}
        <div className="glass glass-pad">
          <h2 className="text-xl font-bold">Contract at a glance</h2>
          <p className="mt-2 text-white/90">
            The core contract is an ERC-721 that stores each pet’s <b>state</b> on-chain
            (level, XP, and four care stats). Metadata (name, image, animation) resolves via tokenURI
            so your pet’s preview looks great wherever you share it.
          </p>

          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-white/15 bg-white/8 p-4">
              <div className="text-sm text-white/70">Core functions</div>
              <ul className="mt-2 space-y-2 text-white/90">
                <li><b>mint(fid)</b>: mints one pet per FID (enforced on-chain).</li>
                <li><b>getState(id)</b>: returns live stats for the pet.</li>
                <li><b>feed/play/clean/rest(id)</b>: care actions that adjust stats.</li>
                <li><b>tokenURI(id)</b>: serves metadata (image / animation).</li>
              </ul>
            </div>

            <div className="rounded-xl border border-white/15 bg-white/8 p-4">
              <div className="text-sm text-white/70">Stats model (simplified)</div>
              <ul className="mt-2 space-y-2 text-white/90">
                <li><b>Mood</b> rises with engagement and care; decays over time.</li>
                <li><b>Hunger</b> is reduced by feed; neglect increases it.</li>
                <li><b>Energy</b> recovers with rest; heavy play will drain it.</li>
                <li><b>Cleanliness</b> improves with clean; slowly decays.</li>
                <li><b>Level/XP</b> climb as you keep stats healthy.</li>
              </ul>
            </div>
          </div>

          <div className="pill-row mt-4">
            <a
              className="pill-note pill-note--blue"
              href={BASESCAN}
              target="_blank"
              rel="noreferrer"
            >
              View contract on BaseScan
            </a>
            <a
              className="pill-note pill-note--green"
              href={`${SITE}/api/og/pet?id=1`}
              target="_blank"
              rel="noreferrer"
            >
              Example OG image endpoint
            </a>
          </div>
        </div>

        {/* Using it in Warpcast */}
        <div className="glass glass-pad">
          <h2 className="text-xl font-bold">Share & Mini App</h2>
          <p className="mt-2 text-white/90">
            Every pet page sets Open Graph and Twitter tags for rich previews.
            The Warpcast Mini App can deep-link to your pet and use the native composer.
          </p>
          <div className="pill-row mt-3">
            <span className="pill-note pill-note--blue">One-tap “Share on Farcaster”</span>
            <span className="pill-note pill-note--yellow">“Share on X” with preview</span>
          </div>
        </div>

        {/* Safety / tips */}
        <div className="glass glass-pad">
          <h2 className="text-xl font-bold">Tips</h2>
          <ul className="mt-3 space-y-2 text-white/90">
            <li>Keep your care stats balanced—extremes affect <b>mood</b> and <b>XP</b> growth.</li>
            <li>Inside Warpcast Mini, we auto-detect your FID for minting and “My Pet”.</li>
            <li>If a preview looks off, refresh metadata by viewing the pet page once.</li>
          </ul>
          <div className="cta-row">
            <Link href="/mint" className="btn-pill btn-pill--orange">Start minting</Link>
            <Link href="/my" className="btn-pill btn-pill--blue">Go to my pet</Link>
          </div>
        </div>

      </section>
    </main>
  );
}
