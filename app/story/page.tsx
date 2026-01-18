// app/story/page.tsx
"use client";

import { useMemo, useState } from "react";
import EpisodeOne from "@/components/story/EpisodeOne";

type EpisodeCard = {
  id: "ep1" | "ep2";
  num: string;
  title: string;
  tagline: string;
  desc: string;
  status: "play" | "locked";
  tone: "emerald" | "purple";
  posterSrc?: string; // put real image path here later
};

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

export default function StoryPage() {
  const [mode, setMode] = useState<"hub" | "ep1">("hub");

  const episodes: EpisodeCard[] = useMemo(
    () => [
      {
        id: "ep1",
        num: "01",
        title: "Awakening Protocol",
        tagline: "A directive without a sender.",
        desc:
          "Your Basebot boots in silence. A choice appears—unrequested. The network will remember what you do.",
        status: "play",
        tone: "emerald",
        posterSrc: "", // later: "/story/ep1.png"
      },
      {
        id: "ep2",
        num: "02",
        title: "Signal Fracture",
        tagline: "Consequences begin to stack.",
        desc:
          "The city responds to your first decision. New actors emerge. The same answers stop working.",
        status: "locked",
        tone: "purple",
        posterSrc: "", // later: "/story/ep2.png"
      },
    ],
    [],
  );

  if (mode === "ep1") {
    return (
      <main
        className="min-h-[calc(100vh-64px)] text-white"
        style={{
          background:
            "radial-gradient(1200px 700px at 50% -10%, rgba(56,189,248,0.10), transparent 55%), radial-gradient(1000px 600px at 15% 105%, rgba(168,85,247,0.12), transparent 60%), radial-gradient(900px 520px at 92% 110%, rgba(52,211,153,0.10), transparent 62%), #020617",
        }}
      >
        <div className="container mx-auto px-4 py-10">
          <EpisodeOne onExit={() => setMode("hub")} />
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-[calc(100vh-64px)] text-white"
      style={{
        background:
          "radial-gradient(1200px 700px at 50% -10%, rgba(56,189,248,0.10), transparent 55%), radial-gradient(1000px 600px at 15% 105%, rgba(168,85,247,0.12), transparent 60%), radial-gradient(900px 520px at 92% 110%, rgba(52,211,153,0.10), transparent 62%), #020617",
      }}
    >
      <div className="container mx-auto px-4 py-12">
        <div
          className="relative overflow-hidden rounded-[28px] border p-6 md:p-8"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.88), rgba(2,6,23,0.64))",
            boxShadow: "0 40px 140px rgba(0,0,0,0.78)",
          }}
        >
          {/* ambient shimmer + grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-95"
            style={{
              background:
                "radial-gradient(1100px 460px at 12% -30%, rgba(121,255,225,0.12), transparent 60%), radial-gradient(1100px 540px at 92% -20%, rgba(56,189,248,0.12), transparent 55%), radial-gradient(900px 520px at 55% 120%, rgba(168,85,247,0.10), transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.14]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage:
                "radial-gradient(800px 360px at 50% 20%, black 40%, transparent 72%)",
              WebkitMaskImage:
                "radial-gradient(800px 360px at 50% 20%, black 40%, transparent 72%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl"
            style={{
              background:
                "radial-gradient(circle, rgba(168,85,247,0.14) 0%, transparent 60%)",
            }}
          />

          <div className="relative">
            {/* Title */}
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

            <h1
              className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight"
              style={{ color: "rgba(255,255,255,0.94)" }}
            >
              BASEBOTS // STORY MODE
            </h1>

            <p
              className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed"
              style={{ color: "rgba(255,255,255,0.70)" }}
            >
              The game isn’t waiting for you to click. It’s waiting to see who you become when you do.
            </p>

            {/* Episodes */}
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="relative overflow-hidden rounded-3xl border"
                  style={{
                    borderColor: ep.status === "play" ? toneBorder(ep.tone) : "rgba(255,255,255,0.10)",
                    background: "rgba(0,0,0,0.22)",
                    boxShadow: "0 30px 110px rgba(0,0,0,0.60)",
                    opacity: ep.status === "play" ? 1 : 0.85,
                  }}
                >
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-95"
                    style={{ background: toneWash(ep.tone) }}
                  />

                  <div className="relative p-5 md:p-6">
                    {/* Poster */}
                    <div
                      className="relative overflow-hidden rounded-2xl border"
                      style={{
                        borderColor: "rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      {ep.posterSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={ep.posterSrc}
                          alt={`${ep.title} poster`}
                          style={{
                            width: "100%",
                            height: 180,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            height: 180,
                            display: "grid",
                            placeItems: "center",
                            background:
                              "radial-gradient(900px 280px at 18% 10%, rgba(121,255,225,0.12), transparent 58%), radial-gradient(900px 280px at 82% 20%, rgba(56,189,248,0.10), transparent 58%), radial-gradient(900px 280px at 55% 120%, rgba(168,85,247,0.10), transparent 58%)",
                          }}
                        >
                          <div className="w-full px-5">
                            <div
                              className="rounded-2xl border p-4"
                              style={{
                                borderColor: "rgba(255,255,255,0.10)",
                                background: "rgba(0,0,0,0.22)",
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div
                                  className="text-[11px] font-semibold tracking-wide"
                                  style={{ color: "rgba(255,255,255,0.68)" }}
                                >
                                  EPISODE POSTER
                                </div>
                                <div
                                  className="text-[11px] font-semibold"
                                  style={{ color: "rgba(255,255,255,0.58)" }}
                                >
                                  {ep.num}
                                </div>
                              </div>
                              <div
                                className="mt-2 text-[13px] font-extrabold"
                                style={{ color: "rgba(255,255,255,0.90)" }}
                              >
                                {ep.title}
                              </div>
                              <div
                                className="mt-1 text-[11px]"
                                style={{ color: "rgba(255,255,255,0.58)" }}
                              >
                                (Add image later)
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div
                        className="absolute right-3 top-3 rounded-full border px-2.5 py-1 text-[10px] font-extrabold"
                        style={{
                          ...chipStyle(ep.tone),
                          borderWidth: 1,
                          background: chipStyle(ep.tone).background as string,
                          borderColor: chipStyle(ep.tone).borderColor as string,
                          color: chipStyle(ep.tone).color as string,
                          backdropFilter: "blur(10px)",
                        }}
                      >
                        {ep.status === "play" ? "PLAY" : "LOCKED"}
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="mt-4">
                      <div className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.58)" }}>
                        EPISODE {ep.num}
                      </div>
                      <div className="mt-1 text-[18px] md:text-[20px] font-extrabold" style={{ color: "rgba(255,255,255,0.92)" }}>
                        {ep.title}
                      </div>
                      <div className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.70)" }}>
                        {ep.tagline}
                      </div>

                      <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.66)" }}>
                        {ep.desc}
                      </p>
                    </div>

                    {/* Action */}
                    <div className="mt-4">
                      {ep.status === "play" ? (
                        <button
                          type="button"
                          onClick={() => setMode("ep1")}
                          className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                          style={{
                            border: "1px solid rgba(255,255,255,0.12)",
                            background:
                              "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(56,189,248,0.90))",
                            color: "rgba(2,6,23,0.98)",
                            boxShadow: "0 16px 50px rgba(52,211,153,0.14)",
                          }}
                        >
                          ▶ Insert Cartridge
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
                          Locked • Coming soon
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.46)" }}>
              The story notices patterns. Hesitation is also a choice.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
