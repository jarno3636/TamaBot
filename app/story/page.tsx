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
  const hasNFT = has("basebots_has_nft"); // stub

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

  /* ───────────────────────────────────────────── */

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

  /* ───────────────────────────────────────────── */

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold">
          BASEBOTS // STORY MODE
        </h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {episodes.map((ep) => (
            <button
              key={ep.id}
              disabled={!ep.unlocked}
              onClick={() => setMode(ep.id)}
              className="rounded-2xl border p-5 text-left transition disabled:opacity-40"
            >
              <div className="font-extrabold">{ep.title}</div>
              <div className="text-sm text-white/70">
                {ep.tagline}
              </div>
              <p className="mt-2 text-xs text-white/60">
                {ep.desc}
              </p>

              <div className="mt-3 text-xs font-semibold">
                {ep.unlocked ? "▶ Insert NFT Cartridge" : "Locked"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
