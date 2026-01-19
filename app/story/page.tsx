"use client";

import React, { useEffect, useMemo, useState } from "react";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

type Mode =
  | "hub"
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5";

type EpisodeId =
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5";

type EpisodeCard = {
  id: EpisodeId;
  title: string;
  tagline: string;
  desc: string;
  unlocked: boolean;
  posterSrc: string;
};

/* ───────────────────────────────────────────── */

const UNLOCK_KEY = "basebots_bonus_unlock";

function has(key: string) {
  try {
    return Boolean(localStorage.getItem(key));
  } catch {
    return false;
  }
}

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");
  const [tick, setTick] = useState(0);

  /* re-evaluate gates periodically */
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  /* ─────────────────────────────────────────────
   * Gate checks
   * ───────────────────────────────────────────── */

  const prologueUnlocked = has(UNLOCK_KEY);
  const hasNFT = has("basebots_has_nft"); // stub for now

  const ep1Done = has("basebots_ep1_done");
  const ep2Done = has("basebots_ep2_done");
  const ep3Done = has("basebots_ep3_done");
  const ep4Done = has("basebots_ep4_done");

  /* ───────────────────────────────────────────── */

  const episodes: EpisodeCard[] = useMemo(
    () => [
      {
        id: "prologue",
        title: "Prologue: Silence in Darkness",
        tagline: prologueUnlocked
          ? "An archived record breaks its silence."
          : "This file does not respond.",
        desc: "Manufacturing origin. Subnet-12.",
        unlocked: prologueUnlocked,
        posterSrc: "/story/prologue.png",
      },
      {
        id: "ep1",
        title: "Awakening Protocol",
        tagline: "A directive without a sender.",
        desc: "Initial observation begins.",
        unlocked: true,
        posterSrc: "/story/01-awakening.png",
      },
      {
        id: "ep2",
        title: "Signal Fracture",
        tagline: "Consequences begin to stack.",
        desc: "External systems respond.",
        unlocked: ep1Done && hasNFT,
        posterSrc: "/story/ep2.png",
      },
      {
        id: "ep3",
        title: "Fault Lines",
        tagline: "Contradictions surface.",
        desc: "Memory is tested.",
        unlocked: ep2Done,
        posterSrc: "/story/ep3.png",
      },
      {
        id: "ep4",
        title: "Threshold",
        tagline: "Alignment before emergence.",
        desc: "Profile assignment.",
        unlocked: ep3Done,
        posterSrc: "/story/ep4.png",
      },
      {
        id: "ep5",
        title: "Emergence",
        tagline: "The city accepts or rejects you.",
        desc: "Surface access granted.",
        unlocked: ep4Done && hasNFT,
        posterSrc: "/story/ep5.png",
      },
    ],
    [tick]
  );

  /* ─────────────────────────────────────────────
   * Mode routing
   * ───────────────────────────────────────────── */

  if (mode === "prologue")
    return <PrologueSilenceInDarkness onExit={() => setMode("hub")} />;

  if (mode === "ep1")
    return <EpisodeOne onExit={() => setMode("hub")} />;

  if (mode === "ep2")
    return <EpisodeTwo onExit={() => setMode("hub")} />;

  if (mode === "ep3")
    return <EpisodeThree onExit={() => setMode("hub")} />;

  if (mode === "ep4")
    return <EpisodeFour onExit={() => setMode("hub")} />;

  if (mode === "ep5")
    return <EpisodeFive onExit={() => setMode("hub")} />;

  /* ─────────────────────────────────────────────
   * HUB UI
   * ───────────────────────────────────────────── */

  return (
    <main
      className="min-h-screen text-white"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% -10%, rgba(56,189,248,0.10), transparent 55%), radial-gradient(1000px 600px at 15% 105%, rgba(168,85,247,0.12), transparent 60%), #020617",
      }}
    >
      <div className="container mx-auto px-4 py-12">
        <div
          className="relative overflow-hidden rounded-[28px] border p-6 md:p-8"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.64))",
            boxShadow: "0 40px 140px rgba(0,0,0,0.78)",
          }}
        >
          {/* ambient grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(800px 360px at 50% 20%, black 40%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(800px 360px at 50% 20%, black 40%, transparent 72%)",
            }}
          />

          <div className="relative">
            <div
              className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.78)",
              }}
            >
              Narrative Cartridge
            </div>

            <h1 className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight">
              BASEBOTS // STORY MODE
            </h1>

            <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-white/70">
              The system does not guide you. It records you.
            </p>

            {/* Episodes */}
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="relative overflow-hidden rounded-3xl border"
                  style={{
                    borderColor: ep.unlocked
                      ? "rgba(56,189,248,0.35)"
                      : "rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.22)",
                    boxShadow: "0 30px 110px rgba(0,0,0,0.60)",
                    opacity: ep.unlocked ? 1 : 0.65,
                  }}
                >
                  <div className="relative p-5 md:p-6">
                    {/* Poster */}
                    <div
                      className="relative overflow-hidden rounded-2xl border"
                      style={{ borderColor: "rgba(255,255,255,0.10)" }}
                    >
                      <img
                        src={ep.posterSrc}
                        alt={ep.title}
                        style={{
                          width: "100%",
                          height: 180,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, rgba(2,6,23,0.05), rgba(2,6,23,0.85))",
                        }}
                      />
                    </div>

                    <div className="mt-4">
                      <div className="text-[18px] md:text-[20px] font-extrabold">
                        {ep.title}
                      </div>
                      <div className="mt-1 text-[12px] text-white/70">
                        {ep.tagline}
                      </div>
                      <p className="mt-3 text-[12px] leading-relaxed text-white/66">
                        {ep.desc}
                      </p>
                    </div>

                    <div className="mt-4">
                      {ep.unlocked ? (
                        <button
                          type="button"
                          onClick={() => setMode(ep.id)}
                          className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                          style={{
                            border: "1px solid rgba(255,255,255,0.12)",
                            background:
                              "linear-gradient(90deg, rgba(56,189,248,0.90), rgba(168,85,247,0.70))",
                            color: "rgba(2,6,23,0.98)",
                            boxShadow: "0 16px 60px rgba(56,189,248,0.14)",
                          }}
                        >
                          ▶ Insert NFT Cartridge
                        </button>
                      ) : (
                        <div
                          className="inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] font-semibold"
                          style={{
                            borderColor: "rgba(255,255,255,0.12)",
                            background: "rgba(255,255,255,0.06)",
                            color: "rgba(255,255,255,0.62)",
                          }}
                        >
                          Locked
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center text-[11px] text-white/46">
              Some records only respond when the room changes.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
