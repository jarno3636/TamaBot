// components/BasebotTokenCard.tsx
import Link from "next/link";

export default function BasebotTokenCard() {
  return (
    <section className="glass glass-pad bg-[#020617]/80 border border-white/10">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            Basebot Token
            <span className="inline-flex items-center rounded-full bg-white/10 px-2 py-[2px] text-[11px] font-semibold tracking-wide text-[#79ffe1] border border-white/20">
              $BOTS
            </span>
          </h2>
          <p className="mt-2 text-sm md:text-base text-white/80 max-w-xl">
            The Basebots’ native token on Base. Launched fair and live on Mint.club —
            no presale, no nonsense, just on-chain bots doing on-chain things.
          </p>

          <div className="mt-3 space-y-1 text-xs md:text-sm text-white/70">
            <div>
              <span className="font-semibold text-[#79ffe1]">Token:</span>{" "}
              Basebot Token
            </div>
            <div>
              <span className="font-semibold text-[#79ffe1]">Ticker:</span>{" "}
              $BOTS
            </div>
            <div className="break-all">
              <span className="font-semibold text-[#79ffe1]">Contract:</span>{" "}
              0xc45d7c40c9c65aF95d33da5921F787D5cFD3FFcf
            </div>
          </div>
        </div>

        <div className="flex flex-col items-stretch md:items-end gap-2 min-w-[220px]">
          <Link
            href="https://mint.club/token/base/BOTS"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-pill btn-pill--blue !w-full md:!w-auto !justify-center"
          >
            Launch Mint.club page ↗
          </Link>

          <div className="flex flex-wrap gap-2 text-[11px] text-white/60 md:justify-end">
            <span className="pill-note pill-note--blue">
              Chain: Base
            </span>
            <span className="pill-note pill-note--cyan">
              Live on Mint.club
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
