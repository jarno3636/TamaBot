"use client";

import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";

type MintCard = { tokenId: string; image: string | null };

export default function CollectionPreview() {
  const title = useMemo(() => "Recently Minted", []);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<MintCard[]>([]);
  const [error, setError] = useState("");

  // prevent double-click overlapping requests
  const inFlight = useRef<AbortController | null>(null);

  async function refresh() {
    if (loading) return;

    setLoading(true);
    setError("");

    // Abort any previous request
    if (inFlight.current) {
      inFlight.current.abort();
      inFlight.current = null;
    }

    const controller = new AbortController();
    inFlight.current = controller;

    // Hard timeout so it can never “spin forever”
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
      if (next.length < 4) {
        setError(
          `Loaded ${next.length}/4. RPC scan may be rate-limited—try Refresh again in a moment.`
        );
      }
    } catch (e: any) {
      if (e?.name === "AbortError") {
        setError("Request timed out. Tap Refresh again (RPC may be slow/rate-limited).");
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
          <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] text-rose-300">
            {error}
          </pre>
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
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="w-1/2 px-2 mb-4 min-w-0"
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

                  <div className="absolute left-2 bottom-2 rounded-full border border-white/15 bg-black/35 px-2 py-[2px] text-[11px] text-white/75">
                    FID #{bot.tokenId}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <p className="mt-1 text-center text-[11px] text-white/45">
          Pulled from on-chain mint events (Transfer from zero address) and rendered from on-chain tokenURI SVG
        </p>
      </div>
    </section>
  );
}
