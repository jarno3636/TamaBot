// components/staking/PoolsFilters.tsx
"use client";

import type { FilterTab } from "./stakingUtils";
import { cx, toneStyle } from "./stakingUtils";

const inputBase =
  "w-full max-w-full rounded-2xl border border-white/15 bg-white/5 px-10 py-2.5 text-[13px] md:text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60";

const tabs: Array<{ key: FilterTab; label: string; tone: "teal" | "sky" | "rose" | "amber" | "emerald" }> = [
  { key: "all", label: "All pools", tone: "teal" },
  { key: "live", label: "Live", tone: "emerald" },
  { key: "closed", label: "Closed", tone: "rose" },
  { key: "my-staked", label: "My staked", tone: "sky" },
  { key: "my-pools", label: "My pools", tone: "amber" },
];

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
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#020617]/75 p-3 md:p-4">
      {/* glow wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background:
            "radial-gradient(900px 260px at 10% -40%, rgba(121,255,225,0.16), transparent 60%), radial-gradient(900px 280px at 90% -30%, rgba(56,189,248,0.12), transparent 55%)",
        }}
      />

      <div className="relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => {
            const active = activeFilter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveFilter(t.key)}
                className={cx(
                  "relative inline-flex items-center justify-center rounded-full border px-4 py-2 text-[12px] font-semibold transition-transform active:scale-95",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60",
                  !active && "border-white/12 bg-white/5 text-white/70 hover:bg-white/10 hover:border-white/20",
                )}
                style={active ? toneStyle(t.tone) : undefined}
              >
                {t.label}
                {/* active underline */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute -bottom-[6px] left-1/2 h-[3px] w-10 -translate-x-1/2 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, rgba(121,255,225,1), rgba(56,189,248,1))",
                      boxShadow: "0 0 16px rgba(121,255,225,0.35)",
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="w-full md:w-[420px]">
          <div className="relative">
            {/* icon bubble */}
            <div
              className="absolute left-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-2xl border flex items-center justify-center"
              style={toneStyle("teal")}
              aria-hidden
            >
              <span className="text-[12px]" style={{ color: "rgba(7,18,27,0.9)" }}>
                ⌕
              </span>
            </div>

            <input
              type="text"
              value={poolSearch}
              onChange={(e) => setPoolSearch(e.target.value)}
              placeholder="Search pool / NFT / token address…"
              className={inputBase}
            />

            {poolSearch?.length > 0 && (
              <button
                type="button"
                onClick={() => setPoolSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/75 hover:bg-white/10 active:scale-95"
              >
                Clear
              </button>
            )}
          </div>

          <div className="mt-2 text-[11px] text-white/55">
            Tip: paste an address to filter instantly.
          </div>
        </div>
      </div>
    </section>
  );
}
