"use client";

import Link from "next/link";

type Step = {
  id: number;
  title: string;
  description: string;
  cta?: {
    label: string;
    href: string;
    external?: boolean;
  };
};

const STEPS: Step[] = [
  {
    id: 1,
    title: "Mint Your Basebot",
    description:
      "Your Basebot is minted using your Farcaster FID. One transaction, fully on-chain, no metadata servers.",
    cta: {
      label: "Mint Basebot",
      href: "#mint",
    },
  },
  {
    id: 2,
    title: "View Your Bot",
    description:
      "Each Basebot is uniquely tied to your FID. Token ID equals your Farcaster identity.",
  },
  {
    id: 3,
    title: "Go to Staking",
    description:
      "Basebots can work. Navigate to the NFT staking pool and put your bot to work earning $BOTS.",
    cta: {
      label: "Go to Staking",
      href: "/staking",
    },
  },
  {
    id: 4,
    title: "Stake Your Basebot",
    description:
      "Approve once, enter your token ID (FID), and stake. Rewards begin immediately.",
  },
  {
    id: 5,
    title: "Earn & Withdraw Anytime",
    description:
      "Earn $BOTS continuously. Claim rewards or unstake at any time — no lockups.",
  },
];

export default function BasebotSteps() {
  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-white">
          How Basebots Work
        </h2>
        <p className="mt-1 text-sm text-white/60">
          Mint → Stake → Earn — fully on-chain.
        </p>
      </header>

      <div className="space-y-4">
        {STEPS.map((step) => (
          <div
            key={step.id}
            className="flex gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
          >
            {/* Step Number */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-bold text-emerald-300">
              {step.id}
            </div>

            {/* Content */}
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white">
                {step.title}
              </h3>

              <p className="mt-1 text-sm text-white/60">
                {step.description}
              </p>

              {/* Image Placeholder */}
              <div className="mt-3 h-24 w-full rounded-lg border border-dashed border-white/15 bg-white/5 flex items-center justify-center text-xs text-white/30">
                Image placeholder
              </div>

              {/* CTA */}
              {step.cta && (
                <div className="mt-3">
                  <Link
                    href={step.cta.href}
                    className="inline-flex items-center rounded-full bg-emerald-400 px-4 py-1.5 text-sm font-semibold text-black hover:bg-emerald-300 transition"
                  >
                    {step.cta.label}
                  </Link>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-6 rounded-xl border border-white/10 bg-white/5 p-3 text-center text-sm text-white/60">
        “In the chrome dawn, the city speaks in light. Basebots understand.”
      </footer>
    </section>
  );
}
