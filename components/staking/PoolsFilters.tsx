// components/staking/PoolsFilters.tsx
"use client";

import type { FilterTab } from "./stakingUtils";

const inputBase =
  "mt-1 w-full max-w-full rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

export default function PoolsFilters({
  activeFilter,
  setActiveFilter,
  poolSearch,
  setPoolSearch,
}: {
  activeFilter: FilterTab;
  setActiveFilter: (t: FilterTab) => void;
  poolSearch: string;
  setPoolSearch: (v: string) => void;
}) {
  return (
    <section className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All pools" },
          { key: "live", label: "Live" },
          { key: "closed", label: "Closed" },
          { key: "my-staked", label: "My staked" },
          { key: "my-pools", label: "My pools" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveFilter(t.key as FilterTab)}
            className={[
              "px-3 py-1.5 rounded-full border transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
              activeFilter === t.key
                ? "border-[#79ffe1] bg-[#031c1b] text-[#79ffe1] shadow-[0_0_14px_rgba(121,255,225,0.6)]"
                : "border-white/15 bg-[#020617] text-white/70 hover:border-white/40",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="w-full md:w-auto">
        <input
          type="text"
          value={poolSearch}
          onChange={(e) => setPoolSearch(e.target.value)}
          placeholder="Search by pool / NFT / token address…"
          className={inputBase + " text-xs md:text-[13px]"}
        />
      </div>
    </section>
  );
}
