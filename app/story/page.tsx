"use client";

import React, { useEffect, useMemo, useState } from "react";
import EpisodeOne from "@/components/story/EpisodeOne";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";

type EpisodeId = "prologue" | "ep1" | "ep2";

type EpisodeCard = {
  id: EpisodeId;
  title: string;
  tagline: string;
  desc: string;
  status: "play" | "locked";
  tone: "emerald" | "purple";
  posterSrc: string;
};

const UNLOCK_KEY = "basebots_bonus_unlock";

function toneBorder(t: EpisodeCard["tone"]) {
  return t === "emerald" ? "rgba(52,211,153,0.26)" : "rgba(168,85,247,0.22)";
}

function toneWash(t: EpisodeCard["tone"]) {
  return t === "emerald"
    ? "radial-gradient(900px 320px at 14% -10%, rgba(52,211,153,0.14), transparent 60%), radial-gradient(820px 300px at 92% 10%, rgba(56,189,248,0.10), transparent 62%)"
    : "radial-gradient(900px 320px at 14% -10%, rgba(168,85,247,0.14), transparent 60%), radial-gradient(820px 300px at 92% 10%, rgba(56,189,248,0.10), transparent 62%)";
}

function chipStyle(t: EpisodeCard["tone"]): React.CSSProperties {
  return t === "emerald"
    ? {
        borderColor: "rgba(52,211,153,0.38)",
        background: "rgba(52,211,153,0.10)",
        color: "rgba(236,253,245,0.92)",
      }
    : {
        borderColor: "rgba(168,85,247,0.38)",
        background: "rgba(168,85,247,0.10)",
        color: "rgba(250,245,255,0.92)",
      };
}

function readPrologueUnlocked() {
  try {
    return Boolean(localStorage.getItem(UNLOCK_KEY));
  } catch {
    return false;
  }
}

export default function StoryPage() {
  const [mode, setMode] = useState<"hub" | "prologue" | "ep1">("hub");
  const [prologueUnlocked, setPrologueUnlocked] = useState(false);

  // Poll unlock state (storage event won't fire in same tab)
  useEffect(() => {
    setPrologueUnlocked(readPrologueUnlocked());
    const t = setInterval(() => setPrologueUnlocked(readPrologueUnlocked()), 500);
    return () => clearInterval(t);
  }, []);

  const episodes: EpisodeCard[] = useMemo(() => {
    return [
      {
        id: "prologue",
        title: "Prologue: Silence in Darkness",
        tagline: prologueUnlocked
          ? "An archived record breaks its silence."
          : "This file does not respond to input.",
        desc: prologueUnlocked
          ? "A manufacturing record surfaces—older than the audit. It wasn’t meant to be accessed from inside the room."
          : "The entry exists, but remains inert. It reacts only when the environment changes.",
        status: prologueUnlocked ? "play" : "locked",
        tone: "purple",
        posterSrc: "/story/prologue.png",
      },
      {
        id: "ep1",
        title: "Awakening Protocol",
        tagline: "A directive without a sender.",
        desc: "Your Basebot boots in silence. A choice appears—unrequested. The network will remember what you do.",
        status: "play",
        tone: "emerald",
        posterSrc: "/story/01-awakening.png",
      },
      {
        id: "ep2",
        title: "Signal Fracture",
        tagline: "Consequences begin to stack.",
        desc: "The city responds to your first decision. New actors emerge. The same answers stop working.",
        status: "locked",
        tone: "purple",
        posterSrc: "/story/ep2.png",
      },
    ];
  }, [prologueUnlocked]);

  const backgroundStyle: React.CSSProperties = {
    background:
      "radial-gradient(1200px 700px at 50% -10%, rgba(56,189,248,0.10), transparent 55%), radial-gradient(1000px 600px at 15% 105%, rgba(168,85,247,0.12), transparent 60%), radial-gradient(900px 520px at 92% 110%, rgba(52,211,153,0.10), transparent 62%), #020617",
  };

  if (mode === "ep1") {
    return (
      <main className="min-h-[calc(100vh-64px)] text-white" style={backgroundStyle}>
        <div className="container mx-auto px-4 py-10">
          <EpisodeOne onExit={() => setMode("hub")} />
        </div>
      </main>
    );
  }

  if (mode === "prologue") {
    return (
      <main className="min-h-[calc(100vh-64px)] text-white" style={backgroundStyle}>
        <div className="container mx-auto px-4 py-10">
          <PrologueSilenceInDarkness onExit={() => setMode("hub")} />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-64px)] text-white" style={backgroundStyle}>
      <div className="container mx-auto px-4 py-12">
        <div
          className="relative overflow-hidden rounded-[28px] border p-6 md:p-8"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.64))",
            boxShadow: "0 40px 140px rgba(0,0,0,0.78)",
          }}
        >
          <div className="relative">
            <div className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
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
              The system doesn’t guide you. It records you.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {episodes.map((ep) => {
                const clickable = ep.status === "play";
                const onOpen = () => {
                  if (!clickable) return;
                  if (ep.id === "ep1") setMode("ep1");
                  if (ep.id === "prologue") setMode("prologue");
                };

                return (
                  <div
                    key={ep.id}
                    className="relative overflow-hidden rounded-3xl border"
                    style={{
                      borderColor: clickable ? toneBorder(ep.tone) : "rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.22)",
                      boxShadow: "0 30px 110px rgba(0,0,0,0.60)",
                      opacity: clickable ? 1 : 0.82,
                    }}
                  >
                    <div aria-hidden className="absolute inset-0 opacity-95" style={{ background: toneWash(ep.tone) }} />

                    <div className="relative p-5 md:p-6">
                      <div className="relative overflow-hidden rounded-2xl border"
                        style={{ borderColor: "rgba(255,255,255,0.10)" }}
                      >
                        <img
                          src={ep.posterSrc}
                          alt={ep.title}
                          style={{ width: "100%", height: 180, objectFit: "cover" }}
                        />

                        <div
                          className="absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-extrabold backdrop-blur"
                          style={{
                            ...chipStyle(ep.tone),
                            borderWidth: 1,
                          }}
                        >
                          {clickable ? "PLAY" : "LOCKED"}
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="text-[18px] md:text-[20px] font-extrabold">{ep.title}</div>
                        <div className="mt-1 text-[12px] text-white/70">{ep.tagline}</div>
                        <p className="mt-3 text-[12px] leading-relaxed text-white/66">{ep.desc}</p>
                      </div>

                      <div className="mt-4">
                        {clickable ? (
                          <button
                            type="button"
                            onClick={onOpen}
                            className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                            style={{
                              border: "1px solid rgba(255,255,255,0.12)",
                              background:
                                ep.tone === "emerald"
                                  ? "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(56,189,248,0.90))"
                                  : "linear-gradient(90deg, rgba(168,85,247,0.90), rgba(56,189,248,0.84))",
                              color: "rgba(2,6,23,0.98)",
                            }}
                          >
                            ▶ Insert Cartridge
                          </button>
                        ) : (
                          <div className="inline-flex items-center rounded-full border px-4 py-1.5 text-[11px] text-white/60">
                            File unresponsive
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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
