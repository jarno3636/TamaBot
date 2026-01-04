"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";

type MintCard = { tokenId: string; image: string | null };

export default function CollectionPreview() {
  const title = useMemo(() => "Recently Minted", []);
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<MintCard[]>([]);
  const [error, setError] = useState("");
  const [active, setActive] = useState<MintCard | null>(null);

  async function refresh() {
    if (loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/basebots/recent?n=4", {
        method: "GET",
        cache: "no-store",
      });

      const text = (await res.text()).replace(/\s+/g, " ").trim();
      if (!res.ok) throw new Error(text || "Failed to load");

      const json = JSON.parse(text);
      if (!json.ok) throw new Error(json.error || "Failed");

      setCards(json.cards ?? []);
    } catch (e: any) {
      setError(
        (e?.message || "Base RPC temporarily unavailable")
          .replace(/\s+/g, " ")
          .trim()
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full flex justify-center">
      <div className="glass glass-pad w-full max-w-md sm:max-w-lg md:max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-center font-extrabold tracking-tight text-3xl md:text-4xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">
              {title}
            </h2>
            <div className="mx-auto mt-3 mb-2 h-1 w-28 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70" />
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <p className="text-[11px] text-rose-300 break-words">{error}</p>
          </div>
        )}

        {/* Grid */}
        {cards.length > 0 && (
          <div className="mt-5 flex flex-wrap -mx-2">
            {cards.map((bot) => (
              <motion.div
                key={bot.tokenId}
                className="w-1/2 px-2 mb-5"
                whileHover={{ scale: 1.03 }}
              >
                <button
                  onClick={() => setActive(bot)}
                  className="w-full focus:outline-none"
                >
                  <div className="aspect-square rounded-xl border border-white/10 bg-[#0b0f18] overflow-hidden">
                    {bot.image ? (
                      <img
                        src={bot.image}
                        alt={`FID ${bot.tokenId}`}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex justify-center">
                    <span className="rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-200">
                      FID #{bot.tokenId}
                    </span>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {active && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
              onClick={() => setActive(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0b0f18] border border-white/10 rounded-2xl p-4 max-w-xl w-full"
              >
                <img
                  src={active.image ?? ""}
                  className="w-full h-auto object-contain"
                />
                <p className="mt-3 text-center text-sm text-white/70">
                  FID #{active.tokenId}
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
