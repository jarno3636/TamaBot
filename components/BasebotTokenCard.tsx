"use client";

import Link from "next/link";
import { useState } from "react";
import { useAccount } from "wagmi";

const OWNER_ADDRESS = "0xB37c91305F50e3CdB0D7a048a18d7536c9524f58" as `0x${string}`;

export default function BasebotTokenCard() {
  const contract = "0xc45d7c40c9c65aF95d33da5921F787D5cFD3FFcf";
  const [copied, setCopied] = useState(false);
  const { address } = useAccount();

  const isOwner =
    address &&
    address.toLowerCase() === OWNER_ADDRESS.toLowerCase();

  const copyAddress = () => {
    navigator.clipboard.writeText(contract);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <section className="glass glass-pad bg-[#020617]/80 border border-white/10">
      <div className="flex flex-col items-center gap-6 text-center">

        {/* --- Token image (top, spinning, slightly smaller) --- */}
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
          <h2 className="text-xl md:text-2xl font-bold flex items-center justify-center gap-2">
            Basebot Token
            <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-[2px] text-[11px] font-semibold tracking-wide text-[#79ffe1] border border-white/20">
              $BOTS
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

          {/* --- Actions --- */}
          <div className="mt-5 flex flex-col md:flex-row items-center justify-center gap-3">
            <Link
              href="https://mint.club/token/base/BOTS"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-pill btn-pill--blue !w-full md:!w-auto !justify-center"
            >
              Mint / trade on Mint.club ↗
            </Link>

            <div className="flex flex-col items-center">
              {isOwner ? (
                <Link
                  href="/staking"
                  className="btn-pill btn-pill--blue !w-full md:!w-auto !justify-center"
                >
                  Stake Your Basebot
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-pill !w-full md:!w-auto !justify-center opacity-40 cursor-not-allowed"
                >
                  Stake Your Basebot
                </button>
              )}

              <span className="mt-1 text-[11px] text-white/50 italic">
                {isOwner
                  ? "Owner-only: configure staking pools"
                  : "Connect owner wallet to manage staking"}
              </span>
            </div>
          </div>

          {/* --- Pills --- */}
          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-white/60 justify-center">
            <span className="pill-note pill-note--blue">Chain: Base</span>
            <span className="pill-note pill-note--cyan">Live on Mint.club</span>
          </div>
        </div>
      </div>
    </section>
  );
}
