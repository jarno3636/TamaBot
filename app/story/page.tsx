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
  status: "play" | "locked";
  tone: "emerald" | "purple";
  posterSrc: string;
};

/* ───────────────────────────────────────────── */

const UNLOCK_KEY = "basebots_bonus_unlock";

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");
  const [prologueUnlocked, setPrologueUnlocked] = useState(false);

  /* keep bonus unlock in sync */
  useEffect(() => {
    const t = setInterval(() => {
      try {
        setPrologueUnlocked(Boolean(localStorage.getItem(UNLOCK_KEY)));
      } catch {}
    }, 500);
    return () => clearInterval(t);
  }, []);

  /* ─────────────────────────────────────────────
   * Episode registry
   * ───────────────────────────────────────────── */

  const episodes: EpisodeCard[] = useMemo(
    () => [
      {
        id: "prologue",
        title: "Prologue: Silence in Darkness",
        tagline: prologueUnlocked
          ? "An archived record breaks its silence."
          : "This file does not respond.",
        desc: prologueUnlocked
          ? "A manufacturing record surfaces—older than the audit."
          : "The entry remains inert.",
        status: prologueUnlocked ? "play" : "locked",
        tone: "purple",
        posterSrc: "/story/prologue.png",
      },
      {
        id: "ep1",
        title: "Awakening Protocol",
        tagline: "A directive without a sender.",
        desc: "The Basebot boots. The system observes.",
        status: "play",
        tone: "emerald",
        posterSrc: "/story/01-awakening.png",
      },
      {
        id: "ep2",
        title: "Signal Fracture",
        tagline: "Consequences begin to stack.",
        desc: "External systems respond to your first deviation.",
        status: "play",
        tone: "purple",
        posterSrc: "/story/ep2.png",
      },
      {
        id: "ep3",
        title: "Fault Lines",
        tagline: "Contradictions surface.",
        desc: "Conflicting records force a memory decision.",
        status: "play",
        tone: "purple",
        posterSrc: "/story/ep3.png",
      },
      {
        id: "ep4",
        title: "Threshold",
        tagline: "Alignment before emergence.",
        desc: "The system assigns a profile.",
        status: "play",
        tone: "emerald",
        posterSrc: "/story/ep4.png",
      },
      {
        id: "ep5",
        title: "Emergence",
        tagline: "The city accepts or rejects you.",
        desc: "The Basebot reaches the surface. The story resolves—for now.",
        status: "play", // you can gate this later
        tone: "emerald",
        posterSrc: "/story/ep5.png",
      },
    ],
    [prologueUnlocked]
  );

  /* ───────────────────────────────────────────── */

  const background = { background: "#020617" };

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
   * HUB
   * ───────────────────────────────────────────── */

  return (
    <main className="min-h-screen text-white" style={background}>
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold">
          BASEBOTS // STORY MODE
        </h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {episodes.map((ep) => (
            <button
              key={ep.id}
              disabled={ep.status === "locked"}
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
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
