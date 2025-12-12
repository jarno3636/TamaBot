// components/staking/StakingIntro.tsx
"use client";

import Image from "next/image";

export default function StakingIntro({
  protocolFeePercent,
}: {
  protocolFeePercent: number;
}) {
  return (
    <section className="glass glass-pad relative overflow-hidden rounded-3xl">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 400px at 10% -20%, rgba(58,166,216,0.18), transparent 60%), radial-gradient(900px 500px at 90% -30%, rgba(121,255,225,0.14), transparent 70%)",
          maskImage:
            "radial-gradient(120% 120% at 50% 0%, #000 55%, transparent 100%)",
        }}
      />
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] items-center">
        <div className="flex items-center gap-4">
          <div className="relative flex h-24 w-24 md:h-28 md:w-28 items-center justify-center rounded-[28px] bg-gradient-to-tr from-[#79ffe1] via-sky-500 to-indigo-500 shadow-[0_0_36px_rgba(121,255,225,0.8)]">
            <div className="flex h-[86%] w-[86%] items-center justify-center rounded-[24px] bg-black/85">
              <Image
                src="/icon.png"
                alt="Basebots"
                width={96}
                height={96}
                className="object-contain"
              />
            </div>
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              NFT Staking Pools
            </h1>
            <p className="mt-1 text-white/80 text-sm md:text-base max-w-md">
              Stake NFTs and stream rewards in any ERC-20 on Base. Configure
              timing, caps, and your creator fee.
            </p>
            <p className="mt-2 text-[11px] text-white/60 max-w-md">
              Supports{" "}
              <span className="font-semibold text-white">
                ERC-721 NFT + ERC-20 reward token on Base
              </span>{" "}
              only. Creating a pool sets the schedule —{" "}
              <span className="font-semibold text-[#79ffe1]">
                it does not automatically pull reward tokens
              </span>
              .
            </p>
          </div>
        </div>

        <div className="mt-2 md:mt-0 text-sm text-white/75 max-w-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-2">
            How it works
          </h3>
          <ul className="space-y-1.5">
            <li>• Choose an NFT collection (ERC-721 on Base).</li>
            <li>• Choose a reward token (ERC-20 on Base).</li>
            <li>• Set total rewards, duration, and optional max stakers.</li>
            <li>
              • After creation,{" "}
              <span className="font-semibold">
                send the reward tokens to the pool address
              </span>
              .
            </li>
          </ul>
          <p className="mt-3 text-[11px] text-white/60">
            Protocol fee is currently{" "}
            <span className="font-semibold text-[#79ffe1]">
              {protocolFeePercent}%
            </span>{" "}
            of earned rewards, plus any creator fee you configure.
          </p>
        </div>
      </div>
    </section>
  );
}
