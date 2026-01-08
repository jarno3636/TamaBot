// components/staking/HowToStaking.tsx
"use client";

import type React from "react";

type HowToCard = {
  id: string;
  badge: string;
  title: string;
  desc: string;
  bullets: string[];
  tone?: "teal" | "sky" | "amber" | "rose" | "purple" | "emerald";
  imageSrc?: string; // NEW
  imageAlt?: string; // NEW
};

function tone(t: NonNullable<HowToCard["tone"]>): React.CSSProperties {
  switch (t) {
    case "teal":
      return {
        borderColor: "rgba(121,255,225,0.28)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.72))",
        boxShadow: "0 30px 90px rgba(0,0,0,0.60), 0 0 0 1px rgba(121,255,225,0.10)",
      };
    case "emerald":
      return {
        borderColor: "rgba(52,211,153,0.28)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.72))",
        boxShadow: "0 30px 90px rgba(0,0,0,0.60), 0 0 0 1px rgba(52,211,153,0.10)",
      };
    case "sky":
      return {
        borderColor: "rgba(56,189,248,0.28)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.72))",
        boxShadow: "0 30px 90px rgba(0,0,0,0.60), 0 0 0 1px rgba(56,189,248,0.10)",
      };
    case "amber":
      return {
        borderColor: "rgba(251,191,36,0.28)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.72))",
        boxShadow: "0 30px 90px rgba(0,0,0,0.60), 0 0 0 1px rgba(251,191,36,0.10)",
      };
    case "rose":
      return {
        borderColor: "rgba(251,113,133,0.28)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.72))",
        boxShadow: "0 30px 90px rgba(0,0,0,0.60), 0 0 0 1px rgba(251,113,133,0.10)",
      };
    case "purple":
    default:
      return {
        borderColor: "rgba(168,85,247,0.26)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.72))",
        boxShadow: "0 30px 90px rgba(0,0,0,0.60), 0 0 0 1px rgba(168,85,247,0.10)",
      };
  }
}

function wash(t: NonNullable<HowToCard["tone"]>): React.CSSProperties {
  switch (t) {
    case "teal":
      return {
        background:
          "radial-gradient(900px 320px at 20% -20%, rgba(121,255,225,0.16), transparent 60%), radial-gradient(700px 260px at 90% 10%, rgba(56,189,248,0.10), transparent 60%)",
      };
    case "emerald":
      return {
        background:
          "radial-gradient(900px 320px at 20% -20%, rgba(52,211,153,0.16), transparent 60%), radial-gradient(700px 260px at 90% 10%, rgba(16,185,129,0.10), transparent 60%)",
      };
    case "sky":
      return {
        background:
          "radial-gradient(900px 320px at 20% -20%, rgba(56,189,248,0.16), transparent 60%), radial-gradient(700px 260px at 90% 10%, rgba(99,102,241,0.10), transparent 60%)",
      };
    case "amber":
      return {
        background:
          "radial-gradient(900px 320px at 20% -20%, rgba(251,191,36,0.16), transparent 60%), radial-gradient(700px 260px at 90% 10%, rgba(245,158,11,0.10), transparent 60%)",
      };
    case "rose":
      return {
        background:
          "radial-gradient(900px 320px at 20% -20%, rgba(251,113,133,0.16), transparent 60%), radial-gradient(700px 260px at 90% 10%, rgba(244,63,94,0.10), transparent 60%)",
      };
    case "purple":
    default:
      return {
        background:
          "radial-gradient(900px 320px at 20% -20%, rgba(168,85,247,0.14), transparent 60%), radial-gradient(700px 260px at 90% 10%, rgba(56,189,248,0.10), transparent 60%)",
      };
  }
}

function badgeStyle(t: NonNullable<HowToCard["tone"]>): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.88)",
  };

  if (t === "teal")
    return {
      ...base,
      borderColor: "rgba(121,255,225,0.55)",
      background: "rgba(121,255,225,0.10)",
      color: "rgba(240,253,250,0.95)",
    };

  if (t === "emerald")
    return {
      ...base,
      borderColor: "rgba(52,211,153,0.55)",
      background: "rgba(52,211,153,0.10)",
      color: "rgba(236,253,245,0.95)",
    };

  if (t === "sky")
    return {
      ...base,
      borderColor: "rgba(56,189,248,0.55)",
      background: "rgba(56,189,248,0.10)",
      color: "rgba(240,249,255,0.95)",
    };

  if (t === "amber")
    return {
      ...base,
      borderColor: "rgba(251,191,36,0.55)",
      background: "rgba(251,191,36,0.10)",
      color: "rgba(255,251,235,0.95)",
    };

  if (t === "rose")
    return {
      ...base,
      borderColor: "rgba(251,113,133,0.55)",
      background: "rgba(251,113,133,0.10)",
      color: "rgba(255,241,242,0.95)",
    };

  return {
    ...base,
    borderColor: "rgba(168,85,247,0.55)",
    background: "rgba(168,85,247,0.10)",
    color: "rgba(250,245,255,0.95)",
  };
}

function StepCard({ card }: { card: HowToCard }) {
  const t = card.tone ?? "teal";

  return (
    <div className="relative overflow-hidden rounded-3xl border p-4 md:p-5" style={tone(t)}>
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-95" style={wash(t)} />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-14 left-0 right-0 h-28 opacity-50"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
          transform: "rotate(-6deg)",
        }}
      />

      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="inline-flex items-center rounded-full px-2 py-[2px] text-[10px] font-bold" style={badgeStyle(t)}>
              {card.badge}
            </div>
            <h4 className="mt-2 text-sm md:text-[15px] font-semibold" style={{ color: "rgba(255,255,255,0.92)" }}>
              {card.title}
            </h4>
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.70)" }}>
              {card.desc}
            </p>
          </div>

          <div
            className="hidden md:flex items-center justify-center rounded-2xl border px-3 py-2 text-[10px] font-mono"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.22)",
              color: "rgba(255,255,255,0.68)",
            }}
          >
            {card.id.toUpperCase()}
          </div>
        </div>

        <ul className="mt-3 space-y-2">
          {card.bullets.map((b, idx) => (
            <li key={idx} className="flex gap-2">
              <span
                aria-hidden
                className="mt-[6px] inline-block h-2 w-2 rounded-full"
                style={{
                  background: "rgba(121,255,225,0.9)",
                  boxShadow: "0 0 0 1px rgba(121,255,225,0.18), 0 0 12px rgba(121,255,225,0.18)",
                }}
              />
              <span className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.68)" }}>
                {b}
              </span>
            </li>
          ))}
        </ul>

        {/* Image (UPDATED) */}
        {card.imageSrc ? (
          <div
            className="mt-4 overflow-hidden rounded-2xl border"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.imageSrc}
              alt={card.imageAlt ?? card.title}
              className="block w-full"
              style={{ height: 150, objectFit: "cover" }}
              loading="lazy"
            />
          </div>
        ) : (
          <div
            className="mt-4 overflow-hidden rounded-2xl border"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
            }}
          >
            <div
              className="flex items-center justify-center"
              style={{
                height: 150,
                background:
                  "radial-gradient(600px 220px at 20% 0%, rgba(121,255,225,0.10), transparent 60%), radial-gradient(520px 220px at 85% 10%, rgba(56,189,248,0.08), transparent 60%)",
                color: "rgba(255,255,255,0.35)",
                fontSize: 12,
                letterSpacing: 0.3,
              }}
            >
              Image slot (add later)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const USER_FLOW: HowToCard[] = [
  {
    id: "u1",
    badge: "USERS • STEP 1",
    title: "Enter a Pool",
    desc: "Pick a pool, connect your wallet, and confirm you hold the NFT collection required to stake.",
    bullets: [
      "Open the pool from the Pools list (Featured pools appear first).",
      "Connect your wallet on Base mainnet.",
      "If you don’t have the NFT yet, mint or acquire it first.",
    ],
    tone: "sky",
    imageSrc: "/tutorial/user-step1.png",
    imageAlt: "User step 1 - enter a pool",
  },
  {
    id: "u2",
    badge: "USERS • STEP 2",
    title: "Approve the NFT (one-time)",
    desc: "Staking requires permission to move your NFT into the pool contract. This approval is required once per pool/NFT contract.",
    bullets: [
      "Click Approve and confirm in your wallet.",
      "Approval does not transfer your NFT yet—it only grants permission.",
      "After approval confirms, the Stake button becomes available.",
    ],
    tone: "teal",
    imageSrc: "/tutorial/user-step2.png",
    imageAlt: "User step 2 - approve NFT",
  },
  {
    id: "u3",
    badge: "USERS • STEP 3",
    title: "Stake Your NFT",
    desc: "Stake by token ID (for Basebots: tokenId == FID). Rewards start accruing at the pool’s configured rate.",
    bullets: [
      "Enter your tokenId (Basebots users: use your Farcaster FID).",
      "Confirm the Stake transaction.",
      "Your NFT is held safely in the pool contract while staked.",
    ],
    tone: "teal",
    imageSrc: "/tutorial/user-step3.png",
    imageAlt: "User step 3 - stake NFT",
  },
  {
    id: "u4",
    badge: "USERS • STEP 4",
    title: "Claim Rewards Anytime",
    desc: "Claiming sends your earned rewards to your wallet. Depending on pool settings, a protocol and/or creator fee may be taken on claim.",
    bullets: [
      "Click Claim to withdraw rewards without unstaking.",
      "Fees (if enabled) are taken automatically by the pool contract.",
      "Claim as often as you want—no lockups required.",
    ],
    tone: "purple",
    imageSrc: "/tutorial/user-step4.png",
    imageAlt: "User step 4 - claim rewards",
  },
  {
    id: "u5",
    badge: "USERS • STEP 5",
    title: "Unstake + Withdraw",
    desc: "Unstake to retrieve your NFT. Pools can optionally take fees on unstake as well (configurable by the creator).",
    bullets: [
      "Click Unstake to retrieve your NFT back to your wallet.",
      "If fees-on-unstake are enabled, they are applied automatically.",
      "You remain in full control: stake, claim, or exit anytime.",
    ],
    tone: "rose",
    imageSrc: "/tutorial/user-step5.png",
    imageAlt: "User step 5 - unstake and withdraw",
  },
];

const CREATOR_FLOW: HowToCard[] = [
  {
    id: "c1",
    badge: "CREATORS • STEP 1",
    title: "Create a Pool",
    desc: "Deploy a staking pool for any ERC-721 and pick an ERC-20 reward token. Set schedule, caps, and creator-fee behavior.",
    bullets: [
      "Enter NFT address and reward token address.",
      "Choose a schedule (start + duration).",
      "Pick creator-fee mode: on claim, on unstake, both, or none.",
    ],
    tone: "amber",
    imageSrc: "/tutorial/creator-step1.png",
    imageAlt: "Creator step 1 - create a pool",
  },
  {
    id: "c2",
    badge: "CREATORS • STEP 2",
    title: "Fund the Pool",
    desc: "Pools must be funded with reward tokens to pay stakers. Funding is simply transferring tokens to the pool contract.",
    bullets: [
      "After creation, click Fund in your creator tools.",
      "Approve the ERC-20 once, then deposit the amount you want.",
      "You can add more rewards later anytime.",
    ],
    tone: "emerald",
    imageSrc: "/tutorial/creator-step2.png",
    imageAlt: "Creator step 2 - fund the pool",
  },
  {
    id: "c3",
    badge: "CREATORS • STEP 3",
    title: "Share Your Pool",
    desc: "Get stakers in with one link. Sharing is the real growth lever for pools.",
    bullets: [
      "Use Share (Warpcast) and Share X buttons in creator tools.",
      "Links include pool + NFT + reward token context.",
      "Pin it, post it, and remind holders to stake.",
    ],
    tone: "sky",
    imageSrc: "/tutorial/creator-step3.png",
    imageAlt: "Creator step 3 - share your pool",
  },
  {
    id: "c4",
    badge: "CREATORS • STEP 4",
    title: "Adjust & Maintain",
    desc: "Creators can keep pools healthy by topping up rewards, monitoring funding runway, and communicating changes.",
    bullets: [
      "Top up rewards if the pool is nearing empty.",
      "Watch staked count to estimate per-NFT earnings.",
      "Keep token decimals correct (18 is typical).",
    ],
    tone: "teal",
    imageSrc: "/tutorial/creator-step4.png",
    imageAlt: "Creator step 4 - monitor and maintain",
  },
  {
    id: "c5",
    badge: "CREATORS • STEP 5",
    title: "Fee Behavior (Automatic)",
    desc: "If enabled, creator fees are taken automatically by the pool contract on claim and/or unstake—no manual actions required.",
    bullets: [
      "Fees apply only when users transact (claim/unstake).",
      "Creator fee is paid out to the creator address configured in the pool.",
      "Protocol fees (if any) are also applied automatically.",
    ],
    tone: "purple",
    imageSrc: "/tutorial/creator-step5.png",
    imageAlt: "Creator step 5 - automatic fee behavior",
  },
];

export default function HowToStaking({
  showCreator = true,
  showUsers = true,
  title = "How to Stake (Users) + Launch Pools (Creators)",
  subtitle = "Two paths: stake NFTs to earn rewards, or create + fund pools for your community. Fully on-chain.",
}: {
  showCreator?: boolean;
  showUsers?: boolean;
  title?: string;
  subtitle?: string;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl border p-4 md:p-6"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "rgba(2,6,23,0.78)",
        boxShadow: "0 40px 120px rgba(0,0,0,0.65)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(1100px 460px at 12% -30%, rgba(121,255,225,0.12), transparent 60%), radial-gradient(1000px 520px at 92% -20%, rgba(56,189,248,0.12), transparent 55%), radial-gradient(900px 520px at 55% 120%, rgba(168,85,247,0.10), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl"
        style={{
          background: "radial-gradient(circle, rgba(121,255,225,0.14) 0%, transparent 60%)",
        }}
      />

      <div className="relative">
        <header className="flex flex-col gap-3">
          <div>
            <div
              className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.78)",
              }}
            >
              Tutorial Module
            </div>

            <h2 className="mt-3 text-lg md:text-2xl font-extrabold tracking-tight" style={{ color: "rgba(255,255,255,0.94)" }}>
              {title}
            </h2>
            <p className="mt-2 text-[12px] md:text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.68)" }}>
              {subtitle}
            </p>
          </div>
        </header>

        <div className="mt-5 grid gap-4">
          {showUsers && (
            <section>
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Users path
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
                    Stake NFTs → Earn rewards
                  </div>
                </div>
                <div
                  className="hidden md:flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold"
                  style={{
                    borderColor: "rgba(56,189,248,0.30)",
                    background: "rgba(56,189,248,0.08)",
                    color: "rgba(240,249,255,0.90)",
                  }}
                >
                  Mint • Approve • Stake • Claim • Unstake
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {USER_FLOW.map((c) => (
                  <StepCard key={c.id} card={c} />
                ))}
              </div>
            </section>
          )}

          {showCreator && (
            <section className="mt-2">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
                    Creators path
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.88)" }}>
                    Create pools → Fund rewards → Grow community
                  </div>
                </div>
                <div
                  className="hidden md:flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold"
                  style={{
                    borderColor: "rgba(251,191,36,0.28)",
                    background: "rgba(251,191,36,0.08)",
                    color: "rgba(255,251,235,0.92)",
                  }}
                >
                  Deploy • Fund • Share • Maintain • Earn fees (optional)
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {CREATOR_FLOW.map((c) => (
                  <StepCard key={c.id} card={c} />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* End image (NEW) */}
        <div
          className="mt-6 overflow-hidden rounded-3xl border"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.22)",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tutorial/tutorial-end.png"
            alt="Tutorial end"
            className="block w-full"
            style={{ height: 220, objectFit: "cover" }}
            loading="lazy"
          />
        </div>

        <footer
          className="mt-6 rounded-2xl border p-3 text-center"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.22)",
            color: "rgba(255,255,255,0.62)",
          }}
        >
          <div className="text-[12px] font-semibold" style={{ color: "rgba(255,255,255,0.78)" }}>
            Pro tip
          </div>
          <div className="mt-1 text-[12px] leading-relaxed">
            Pools only pay rewards while funded. If you’re a creator, top up before rewards run out. If you’re a staker,
            claim whenever you want—no lockups required.
          </div>
        </footer>
      </div>
    </section>
  );
}
