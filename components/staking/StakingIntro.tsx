// components/staking/StakingIntro.tsx
"use client";

import Image from "next/image";
import { toneStyle } from "./stakingUtils";

export default function StakingIntro({ protocolFeePercent }: { protocolFeePercent: number }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#020617]/75 p-5 md:p-6">
      {/* stronger hero wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(1000px 420px at 12% -20%, rgba(121,255,225,0.22), transparent 60%), radial-gradient(1000px 520px at 90% -30%, rgba(56,189,248,0.16), transparent 60%), radial-gradient(900px 480px at 50% 120%, rgba(168,85,247,0.10), transparent 55%)",
          maskImage: "radial-gradient(120% 120% at 50% 0%, #000 55%, transparent 100%)",
        }}
      />

      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-start">
        {/* Left */}
        <div className="flex items-start gap-4">
          <div
            className="relative flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-[28px] border"
            style={{
              ...toneStyle("teal"),
              background:
                "linear-gradient(135deg, rgba(121,255,225,0.55), rgba(56,189,248,0.28), rgba(99,102,241,0.22))",
              boxShadow: "0 0 0 1px rgba(121,255,225,0.20), 0 0 44px rgba(121,255,225,0.30)",
            }}
          >
            <div className="flex h-[86%] w-[86%] items-center justify-center rounded-[24px] bg-black/85 border border-white/10">
              <Image src="/icon.png" alt="Basebots" width={96} height={96} className="object-contain" />
            </div>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">NFT Staking Pools</h1>
              <span className="inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-semibold" style={toneStyle("sky")}>
                Base
              </span>
              <span className="inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-semibold" style={toneStyle("teal")}>
                ERC-721 → ERC-20
              </span>
            </div>

            <p className="mt-2 text-white/80 text-sm md:text-base max-w-xl">
              Stake NFTs and stream rewards in any ERC-20 on Base. Set timing, caps, and an optional creator fee.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold" style={toneStyle("emerald")}>
                Live rewards
              </span>
              <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold" style={toneStyle("amber")}>
                Creator incentives
              </span>
              <span className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold" style={toneStyle("white")}>
                Fund by transfer
              </span>
            </div>

            <p className="mt-3 text-[11px] text-white/60 max-w-xl">
              Creating a pool sets the schedule —{" "}
              <span className="font-semibold" style={{ color: "rgba(121,255,225,0.95)" }}>
                it does not pull tokens
              </span>
              . You fund by sending ERC-20 tokens to the pool address.
            </p>
          </div>
        </div>

        {/* Right */}
        <div className="rounded-3xl border border-white/10 bg-black/35 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60">How it works</h3>
            <span className="inline-flex items-center rounded-full border px-2 py-[2px] text-[10px] font-semibold" style={toneStyle("teal")}>
              Protocol fee: {protocolFeePercent}%
            </span>
          </div>

          <ol className="mt-3 space-y-2 text-[12px] text-white/80">
            <li className="flex gap-2">
              <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold" style={toneStyle("sky")}>
                1
              </span>
              <span>Pick an NFT collection (ERC-721 on Base).</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold" style={toneStyle("teal")}>
                2
              </span>
              <span>Pick a reward token (ERC-20) + set a reward rate & duration.</span>
            </li>
            <li className="flex gap-2">
              <span className="mt-[2px] inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] font-bold" style={toneStyle("amber")}>
                3
              </span>
              <span>Create the pool, then fund it by sending tokens to the pool address.</span>
            </li>
          </ol>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3 text-[11px] text-white/65">
            Rewards shown in the UI are estimates based on current staked count and current reward rate.
          </div>
        </div>
      </div>
    </section>
  );
}
