// app/story/page.tsx
"use client";

import { useMemo, useState } from "react";
import TimedChoiceModal, { TimedChoice } from "@/components/story/TimedChoiceModal";

type Episode = {
  id: string;
  num: string;
  title: string;
  tagline: string;
  desc: string;
  status: "playable" | "coming";
  tone: "teal" | "sky" | "amber" | "rose" | "purple" | "emerald";
  image: { src: string; alt: string };
};

function toneChip(t: Episode["tone"]): React.CSSProperties {
  const base: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.74)",
  };

  if (t === "emerald")
    return {
      ...base,
      borderColor: "rgba(52,211,153,0.38)",
      background: "rgba(52,211,153,0.10)",
      color: "rgba(236,253,245,0.92)",
    };
  if (t === "teal")
    return {
      ...base,
      borderColor: "rgba(121,255,225,0.38)",
      background: "rgba(121,255,225,0.10)",
      color: "rgba(240,253,250,0.92)",
    };
  if (t === "sky")
    return {
      ...base,
      borderColor: "rgba(56,189,248,0.38)",
      background: "rgba(56,189,248,0.10)",
      color: "rgba(240,249,255,0.92)",
    };
  if (t === "amber")
    return {
      ...base,
      borderColor: "rgba(251,191,36,0.38)",
      background: "rgba(251,191,36,0.10)",
      color: "rgba(255,251,235,0.92)",
    };
  if (t === "rose")
    return {
      ...base,
      borderColor: "rgba(251,113,133,0.38)",
      background: "rgba(251,113,133,0.10)",
      color: "rgba(255,241,242,0.92)",
    };
  return {
    ...base,
    borderColor: "rgba(168,85,247,0.38)",
    background: "rgba(168,85,247,0.10)",
    color: "rgba(250,245,255,0.92)",
  };
}

function accentGradient(t: Episode["tone"]) {
  switch (t) {
    case "emerald":
      return "linear-gradient(180deg, rgba(52,211,153,0.95), rgba(16,185,129,0.35))";
    case "teal":
      return "linear-gradient(180deg, rgba(121,255,225,0.95), rgba(56,189,248,0.35))";
    case "sky":
      return "linear-gradient(180deg, rgba(56,189,248,0.95), rgba(99,102,241,0.35))";
    case "amber":
      return "linear-gradient(180deg, rgba(251,191,36,0.95), rgba(245,158,11,0.35))";
    case "rose":
      return "linear-gradient(180deg, rgba(251,113,133,0.95), rgba(244,63,94,0.35))";
    default:
      return "linear-gradient(180deg, rgba(168,85,247,0.95), rgba(56,189,248,0.30))";
  }
}

function cardBorder(t: Episode["tone"]): string {
  switch (t) {
    case "emerald":
      return "rgba(52,211,153,0.26)";
    case "teal":
      return "rgba(121,255,225,0.24)";
    case "sky":
      return "rgba(56,189,248,0.22)";
    case "amber":
      return "rgba(251,191,36,0.22)";
    case "rose":
      return "rgba(251,113,133,0.22)";
    default:
      return "rgba(168,85,247,0.20)";
  }
}

function cardWash(t: Episode["tone"]): string {
  switch (t) {
    case "emerald":
      return "radial-gradient(820px 300px at 12% -10%, rgba(52,211,153,0.14), transparent 60%), radial-gradient(740px 280px at 96% 18%, rgba(16,185,129,0.08), transparent 62%)";
    case "teal":
      return "radial-gradient(820px 300px at 12% -10%, rgba(121,255,225,0.14), transparent 60%), radial-gradient(740px 280px at 96% 18%, rgba(56,189,248,0.08), transparent 62%)";
    case "sky":
      return "radial-gradient(820px 300px at 12% -10%, rgba(56,189,248,0.14), transparent 60%), radial-gradient(740px 280px at 96% 18%, rgba(99,102,241,0.08), transparent 62%)";
    case "amber":
      return "radial-gradient(820px 300px at 12% -10%, rgba(251,191,36,0.14), transparent 60%), radial-gradient(740px 280px at 96% 18%, rgba(245,158,11,0.08), transparent 62%)";
    case "rose":
      return "radial-gradient(820px 300px at 12% -10%, rgba(251,113,133,0.14), transparent 60%), radial-gradient(740px 280px at 96% 18%, rgba(244,63,94,0.08), transparent 62%)";
    default:
      return "radial-gradient(820px 300px at 12% -10%, rgba(168,85,247,0.12), transparent 60%), radial-gradient(740px 280px at 96% 18%, rgba(56,189,248,0.08), transparent 62%)";
  }
}

export default function StoryPage() {
  const [openChoice, setOpenChoice] = useState(false);
  const [lastChoice, setLastChoice] = useState<string | null>(null);

  // Replace these with real images later. For now: a gorgeous inline placeholder “poster” panel.
  // If you DO add files, just change src to "/story/ep1.png" etc and it will work.
  const episodes: Episode[] = useMemo(
    () => [
      {
        id: "ep1",
        num: "01",
        title: "Awakening Protocol",
        tagline: "A signal that wasn’t meant for you.",
        desc:
          "Your Basebot boots in silence. A directive arrives without a sender. The timer starts. The city waits.",
        status: "playable",
        tone: "emerald",
        image: { src: "", alt: "Episode 1 poster art placeholder" },
      },
      {
        id: "ep2",
        num: "02",
        title: "Signal Fracture",
        tagline: "Two truths. One chain.",
        desc:
          "The network responds to your first decision. New actors emerge. The same choices won’t work twice.",
        status: "coming",
        tone: "purple",
        image: { src: "", alt: "Episode 2 poster art placeholder" },
      },
      {
        id: "ep3",
        num: "03",
        title: "Vault of Echoes",
        tagline: "Rewards have memories.",
        desc:
          "The vault opens—too clean, too perfect. Something inside remembers your wallet.",
        status: "coming",
        tone: "sky",
        image: { src: "", alt: "Episode 3 poster art placeholder" },
      },
      {
        id: "ep4",
        num: "04",
        title: "Protocol: Break",
        tagline: "The game notices you.",
        desc:
          "The UI begins to react. Not to your clicks— to your hesitation.",
        status: "coming",
        tone: "rose",
        image: { src: "", alt: "Episode 4 poster art placeholder" },
      },
    ],
    [],
  );

  const choices: TimedChoice[] = useMemo(
    () => [
      { id: "accept", label: "Accept Initialization", hint: "Play along. Learn the rules first.", tone: "teal" },
      { id: "delay", label: "Delay Response", hint: "Buy time. Watch the signal’s behavior.", tone: "sky" },
      { id: "override", label: "Override Directive", hint: "Take control. Risk a hard branch.", tone: "amber" },
      { id: "mirror", label: "Mirror the Signal", hint: "Send it back. See who flinches.", tone: "purple" },
    ],
    [],
  );

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
            className="pointer-events-none absolute -top-20 left-0 right-0 h-28 opacity-55"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
              transform: "rotate(-6deg)",
            }}
          />

          <div className="relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="max-w-2xl">
                <div
                  className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-wide"
                  style={{
                    borderColor: "rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.78)",
                  }}
                >
                  Narrative Cartridge • Episode Hub
                </div>

                <h1
                  className="mt-4 text-2xl md:text-4xl font-extrabold tracking-tight"
                  style={{
                    color: "rgba(255,255,255,0.94)",
                    textShadow: "0 18px 70px rgba(0,0,0,0.70)",
                    letterSpacing: "-0.02em",
                  }}
                >
                  BASEBOTS // STORY MODE
                </h1>

                <p
                  className="mt-3 text-sm md:text-base leading-relaxed"
                  style={{ color: "rgba(255,255,255,0.70)" }}
                >
                  The city hums beneath the chain. Your Basebot boots for the first time—then receives a directive
                  that <span style={{ color: "rgba(255,255,255,0.92)", fontWeight: 700 }}>didn’t come from you</span>.
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                    style={{
                      borderColor: "rgba(121,255,225,0.28)",
                      background: "rgba(121,255,225,0.08)",
                      color: "rgba(240,253,250,0.92)",
                    }}
                  >
                    Choices matter
                  </div>
                  <div
                    className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                    style={{
                      borderColor: "rgba(168,85,247,0.26)",
                      background: "rgba(168,85,247,0.08)",
                      color: "rgba(250,245,255,0.92)",
                    }}
                  >
                    Timed decisions
                  </div>
                  <div
                    className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                    style={{
                      borderColor: "rgba(56,189,248,0.24)",
                      background: "rgba(56,189,248,0.08)",
                      color: "rgba(240,249,255,0.92)",
                    }}
                  >
                    On-chain continuity (soon)
                  </div>
                </div>

                {lastChoice && (
                  <div
                    className="mt-4 rounded-2xl border px-4 py-3 text-[12px]"
                    style={{
                      borderColor: "rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.22)",
                      color: "rgba(255,255,255,0.70)",
                    }}
                  >
                    <span style={{ color: "rgba(255,255,255,0.90)", fontWeight: 700 }}>
                      Last decision recorded:
                    </span>{" "}
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}>
                      {lastChoice}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: “console” teaser panel */}
              <div
                className="w-full md:w-[360px] rounded-3xl border p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.22)",
                  boxShadow: "0 24px 90px rgba(0,0,0,0.55)",
                }}
              >
                <div
                  className="flex items-center justify-between"
                  style={{ color: "rgba(255,255,255,0.76)" }}
                >
                  <div className="text-[11px] font-semibold tracking-wide">SYSTEM STATUS</div>
                  <div className="flex items-center gap-2 text-[11px] font-semibold">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background: "rgba(52,211,153,0.95)",
                        boxShadow: "0 0 18px rgba(52,211,153,0.22)",
                      }}
                    />
                    READY
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {[
                    { k: "Cartridge Slot", v: "Detected" },
                    { k: "Signal Source", v: "Unknown" },
                    { k: "Timer Events", v: "Armed" },
                    { k: "Continuity", v: "Draft (Local)" },
                  ].map((row) => (
                    <div
                      key={row.k}
                      className="flex items-center justify-between rounded-2xl border px-3 py-2"
                      style={{
                        borderColor: "rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                      }}
                    >
                      <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                        {row.k}
                      </div>
                      <div
                        className="text-[11px] font-semibold"
                        style={{ color: "rgba(255,255,255,0.84)" }}
                      >
                        {row.v}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setOpenChoice(true)}
                  className="mt-4 w-full rounded-full px-4 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                      "linear-gradient(90deg, rgba(52,211,153,1), rgba(56,189,248,0.92), rgba(168,85,247,0.72))",
                    color: "rgba(2,6,23,0.98)",
                    boxShadow: "0 16px 46px rgba(52,211,153,0.16)",
                  }}
                >
                  Trigger a Timed Choice (Demo)
                </button>

                <div
                  className="mt-3 text-[11px]"
                  style={{ color: "rgba(255,255,255,0.52)" }}
                >
                  It won’t feel like a tutorial once the story starts.
                </div>
              </div>
            </div>

            {/* Episodes */}
            <div className="mt-10 grid gap-4 md:grid-cols-2">
              {episodes.map((ep) => {
                const locked = ep.status !== "playable";

                return (
                  <div
                    key={ep.id}
                    className="relative overflow-hidden rounded-3xl border"
                    style={{
                      borderColor: locked ? "rgba(255,255,255,0.10)" : cardBorder(ep.tone),
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0.26), rgba(0,0,0,0.18))",
                      boxShadow: locked
                        ? "0 24px 90px rgba(0,0,0,0.45)"
                        : "0 30px 110px rgba(0,0,0,0.60)",
                      opacity: locked ? 0.84 : 1,
                    }}
                  >
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 opacity-95"
                      style={{ background: cardWash(ep.tone) }}
                    />
                    <div
                      aria-hidden
                      className="pointer-events-none absolute -top-12 left-0 right-0 h-24 opacity-40"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
                        transform: "rotate(-6deg)",
                      }}
                    />

                    {/* Left accent bar */}
                    <div
                      aria-hidden
                      className="absolute left-0 top-0 bottom-0 w-[6px]"
                      style={{ background: accentGradient(ep.tone), opacity: locked ? 0.5 : 0.9 }}
                    />

                    <div className="relative p-5 md:p-6">
                      {/* Poster area */}
                      <div
                        className="relative overflow-hidden rounded-2xl border"
                        style={{
                          borderColor: "rgba(255,255,255,0.10)",
                          background: "rgba(255,255,255,0.04)",
                        }}
                      >
                        {/* If you add real image src, it will show. Otherwise: pretty placeholder poster. */}
                        {ep.image.src ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={ep.image.src}
                            alt={ep.image.alt}
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
                                <div className="flex items-center justify-between gap-3">
                                  <div
                                    className="text-[11px] font-semibold tracking-wide"
                                    style={{ color: "rgba(255,255,255,0.70)" }}
                                  >
                                    EPISODE POSTER
                                  </div>
                                  <div
                                    className="text-[11px] font-semibold"
                                    style={{ color: "rgba(255,255,255,0.60)" }}
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
                                  style={{ color: "rgba(255,255,255,0.62)" }}
                                >
                                  (Add image later)
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Top-right chip */}
                        <div
                          className="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-extrabold"
                          style={{
                            ...toneChip(ep.tone),
                            backdropFilter: "blur(8px)",
                          }}
                        >
                          {locked ? "LOCKED" : "PLAY"}
                        </div>
                      </div>

                      {/* Meta */}
                      <div className="mt-4 flex items-start justify-between gap-3">
                        <div>
                          <div
                            className="text-[11px] font-semibold tracking-wide"
                            style={{ color: "rgba(255,255,255,0.58)" }}
                          >
                            EPISODE {ep.num}
                          </div>
                          <div
                            className="mt-1 text-[18px] md:text-[20px] font-extrabold"
                            style={{ color: "rgba(255,255,255,0.92)" }}
                          >
                            {ep.title}
                          </div>
                          <div
                            className="mt-1 text-[12px]"
                            style={{ color: "rgba(255,255,255,0.70)" }}
                          >
                            {ep.tagline}
                          </div>
                        </div>

                        <div
                          className="hidden sm:flex items-center justify-center rounded-2xl border px-3 py-2 text-[10px] font-mono"
                          style={{
                            borderColor: "rgba(255,255,255,0.12)",
                            background: "rgba(0,0,0,0.20)",
                            color: "rgba(255,255,255,0.66)",
                          }}
                        >
                          {ep.id.toUpperCase()}
                        </div>
                      </div>

                      <p
                        className="mt-3 text-[12px] leading-relaxed"
                        style={{ color: "rgba(255,255,255,0.66)" }}
                      >
                        {ep.desc}
                      </p>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {ep.status === "playable" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setOpenChoice(true)}
                              className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                              style={{
                                border: "1px solid rgba(255,255,255,0.12)",
                                background:
                                  "linear-gradient(90deg, rgba(52,211,153,1), rgba(56,189,248,0.92))",
                                color: "rgba(2,6,23,0.98)",
                                boxShadow: "0 14px 40px rgba(52,211,153,0.18)",
                              }}
                            >
                              ▶ Insert Cartridge
                            </button>

                            <div
                              className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
                              style={{
                                borderColor: "rgba(255,255,255,0.12)",
                                background: "rgba(255,255,255,0.06)",
                                color: "rgba(255,255,255,0.70)",
                              }}
                            >
                              Draft build • Choices save later
                            </div>
                          </>
                        ) : (
                          <div
                            className="inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold"
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
                );
              })}
            </div>

            {/* Footer flavor (minimal + gamey) */}
            <div
              className="mt-8 text-center text-[11px]"
              style={{ color: "rgba(255,255,255,0.46)" }}
            >
              The story notices patterns. Hesitation is also a choice.
            </div>
          </div>
        </div>
      </div>

      {/* Timed choice modal (Episode 1 demo) */}
      <TimedChoiceModal
        open={openChoice}
        title="SIGNAL RECEIVED"
        prompt="Your Basebot receives its first instruction. It did not come from you."
        choices={choices}
        seconds={12}
        defaultChoiceId="delay"
        onResolve={(r) => {
          if (r.kind === "picked") setLastChoice(r.choiceId);
          else setLastChoice(`expired → ${r.defaultChoiceId}`);
          setOpenChoice(false);
        }}
        allowEscapeClose={false}
        onClose={() => setOpenChoice(false)}
      />
    </main>
  );
}
