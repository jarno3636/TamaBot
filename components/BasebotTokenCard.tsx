"use client";

import Link from "next/link";
import { useState } from "react";

export default function BasebotTokenCard() {
  const contract = "0xc45d7c40c9c65aF95d33da5921F787D5cFD3FFcf";
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    navigator.clipboard.writeText(contract);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="glass glass-pad bg-[#020617]/80 border border-white/10">
      <div className="flex flex-col items-center gap-6 text-center">
        {/* --- Token image (top, spinning) --- */}
        <div className="relative w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border border-white/10 shadow-lg bg-[#020617] flex items-center justify-center">
          <img
            src="/token_icon.png"
            alt="Basebot Token"
            className="token-spin"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        {/* --- Text content --- */}
        <div className="flex-1 min-w-0 w-full">
          <h2 className="text-xl md:text-2xl font-bold flex flex-wrap items-center justify-center gap-2">
            Basebot Token
            <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-[2px] text-[11px] font-semibold tracking-wide text-[#79ffe1] border border-white/20">
              $BOTS
            </span>

            {/* ✅ Added: Staking Now Live */}
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-[2px] text-[11px] font-semibold tracking-wide text-emerald-200 border border-emerald-400/40">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
              Staking Now Live
            </span>
          </h2>

          <p className="mt-2 text-sm md:text-base text-white/80 max-w-xl mx-auto">
            The Basebots&apos; native token on Base. Launched live on Mint.club —
            no presale, no nonsense, just on-chain bots doing on-chain things.
          </p>

          <div className="mt-3 space-y-1 text-xs md:text-sm text-white/70 max-w-xl mx-auto">
            <div>
              <span className="font-semibold text-[#79ffe1]">Token:</span>{" "}
              Basebot Token
            </div>
            <div>
              <span className="font-semibold text-[#79ffe1]">Ticker:</span>{" "}
              $BOTS
            </div>

            {/* --- Clean, truncated, copyable contract address --- */}
            <div className="flex flex-col items-center justify-center gap-1 mt-2">
              <span className="font-semibold text-[#79ffe1]">Contract:</span>

              <button
                onClick={copyAddress}
                className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-[11px] text-white/80 hover:bg-white/20 transition"
              >
                {copied ? "✓ Copied!" : "0xc45d…3FFcf"}
              </button>
            </div>
          </div>

          {/* --- Actions (✅ No gating / no disabled state) --- */}
          <div className="mt-5 flex flex-col md:flex-row items-center justify-center gap-3">
            <Link
              href="https://mint.club/token/base/BOTS"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill btn-pill--blue !w-full md:!w-auto !justify-center"
            >
              Mint / trade on Mint.club ↗
            </Link>

            <Link
              href="/staking"
              className="btn-pill btn-pill--blue !w-full md:!w-auto !justify-center"
            >
              Stake Your Basebot
            </Link>
          </div>

          {/* --- Public staking promo (✅ no owner gating) --- */}
          <div className="mt-4 max-w-xl mx-auto rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-xs md:text-sm text-white/75 flex flex-col gap-2">
            <p>
              <span className="font-semibold text-[#79ffe1]">Staking is live.</span>{" "}
              Stake your Basebot to earn rewards and track your progress on-chain.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:justify-center">
              <span className="text-[11px] uppercase tracking-wide text-white/60">
                Open to everyone.
              </span>
              <Link
                href="/staking"
                className="btn-pill !w-full sm:!w-auto !justify-center text-[12px]"
              >
                Go to Staking ↗
              </Link>
            </div>
          </div>

          {/* --- Pills --- */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/60 justify-center">
            <span className="pill-note pill-note--blue">Chain: Base</span>
            <span className="pill-note pill-note--cyan">Live on Mint.club</span>
            <span className="pill-note pill-note--blue">Staking: Live</span>
          </div>
        </div>
      </div>
    </section>
  );
}
