"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useRef, useState } from "react";

type MintCard = { tokenId: string; image: string | null };

export default function CollectionPreview() {
  const title = useMemo(() => "Recently Minted", []);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<MintCard[]>([]);
  const [error, setError] = useState("");

  // popup viewer
  const [active, setActive] = useState<MintCard | null>(null);

  // prevent double-click overlapping requests
  const inFlight = useRef<AbortController | null>(null);

  async function refresh() {
    if (loading) return;

    setLoading(true);
    setError("");

    if (inFlight.current) {
      inFlight.current.abort();
      inFlight.current = null;
    }

    const controller = new AbortController();
    inFlight.current = controller;

    const timeout = setTimeout(() => controller.abort(), 15_000);

    try {
      const res = await fetch("/api/basebots/recent?n=4&deployBlock=37969324", {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      const text = await res.text();
      if (!res.ok) throw new Error(`API ${res.status}: ${text}`);

      const json = JSON.parse(text);
      if (!json?.ok) throw new Error(json?.error || text || "API returned ok=false");

      const next = Array.isArray(json.cards) ? (json.cards as MintCard[]) : [];
      setCards(next);

      if (next.length === 0) {
        setError("No mints found in the scanned window yet. Try again in a moment.");
      } else if (next.length < 4) {
        setError(`Loaded ${next.length}/4. Try Refresh again to fill remaining.`);
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setError("Request timed out. Tap Refresh again (RPC may be slow).");
      } else {
        setError(e?.message || "HTTP request failed.");
      }
    } finally {
      clearTimeout(timeout);
      inFlight.current = null;
      setLoading(false);
    }
  }

  return (
    <section className="w-full flex justify-center">
      <div className="glass glass-pad w-full max-w-md sm:max-w-lg md:max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-center font-extrabold tracking-tight text-3xl md:text-4xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">
              {title}
            </h2>
            <div
              aria-hidden
              className="mx-auto mt-3 mb-2 h-1 w-28 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70"
            />
          </div>

          <button
            type="button"
            onClick={() => void refresh()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60 active:scale-95 transition-transform"
          >
            {loading ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-white/50 border-t-transparent" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-white/25 bg-white/10" />
            )}
            <span>{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <pre className="whitespace-pre-wrap text-[11px] text-rose-300 max-h-[160px] overflow-auto">
              {error}
            </pre>
          </div>
        )}

        {!loading && cards.length === 0 && (
          <p className="mt-3 text-center text-sm text-white/70">
            Click <span className="font-semibold text-white/80">Refresh</span> to load the last 4 mints.
          </p>
        )}

        {cards.length > 0 && (
          <div className="mt-5 flex flex-wrap -mx-2 min-w-0">
            {cards.map((bot) => (
              <motion.div
                key={bot.tokenId}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: "spring", stiffness: 240, damping: 18 }}
                className="w-1/2 px-2 mb-5 min-w-0"
              >
                <button
                  type="button"
                  onClick={() => setActive(bot)}
                  className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60 rounded-xl"
                  title="Tap to expand"
                >
                  <div className="aspect-square rounded-xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-md overflow-hidden relative">
                    {bot.image ? (
                      <img
                        src={bot.image}
                        alt={`Basebot FID #${bot.tokenId}`}
                        className="w-full h-full object-contain p-2 block"
                        draggable={false}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                        <div className="h-6 w-6 animate-spin rounded-full border border-white/30 border-t-transparent" />
                        <div className="mt-2 text-[11px]">No SVG returned</div>
                      </div>
                    )}

                    <div className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/35 px-2 py-[2px] text-[10px] text-white/70">
                      Tap
                    </div>
                  </div>

                  <div className="mt-2 flex justify-center">
                    <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                      FID #{bot.tokenId}
                    </span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}

        <p className="mt-1 text-center text-[11px] text-white/45">
          Pulled from on-chain mint events and rendered from on-chain tokenURI SVG
        </p>

        <AnimatePresence>
          {active && (
            <motion.div
              className="fixed inset-0 z-[80] flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              aria-modal="true"
              role="dialog"
              onClick={() => setActive(null)}
            >
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

              <motion.div
                className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#0b0f18]/90 shadow-2xl overflow-hidden"
                initial={{ scale: 0.96, y: 12, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.97, y: 10, opacity: 0 }}
                transition={{ type: "spring", stiffness: 240, damping: 22 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[12px] font-semibold text-emerald-200">
                      FID #{active.tokenId}
                    </span>
                    <span className="text-[12px] text-white/60">Recently minted</span>
                  </div>

                  <button
                    type="button"
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[12px] font-semibold text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60"
                    onClick={() => setActive(null)}
                  >
                    Close
                  </button>
                </div>

                <div className="p-4">
                  <div className="aspect-square rounded-2xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] overflow-hidden flex items-center justify-center">
                    {active.image ? (
                      <img
                        src={active.image}
                        alt={`Basebot FID #${active.tokenId}`}
                        className="w-full h-full object-contain p-3 block"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/60">
                        <div className="h-7 w-7 animate-spin rounded-full border border-white/30 border-t-transparent" />
                        <div className="mt-2 text-[12px]">No SVG returned</div>
                      </div>
                    )}
                  </div>

                  <p className="mt-3 text-center text-[11px] text-white/55">Tap outside to close.</p>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
