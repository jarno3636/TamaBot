// components/story/EpisodeOne.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export type EpisodeOneChoiceId = "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";

type SaveShape = {
  v: number;
  episodeId: "ep1";
  choiceId: EpisodeOneChoiceId;
  flags: {
    complied: boolean;
    cautious: boolean;
    adversarial: boolean;
    severed: boolean;
  };
  profile: {
    archetype: "Operator" | "Ghost" | "Saboteur" | "Severed";
    threat: number;
    trust: number;
  };
  artifact: {
    name: string;
    desc: string;
  };
  createdAt: number;
};

const STORAGE_KEY = "basebots_story_save_v1";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function saveToLocal(save: SaveShape) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {}
}

function loadFromLocal(): SaveShape | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SaveShape;
    if (!parsed?.episodeId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function meterStyle(kind: "trust" | "threat", value: number): React.CSSProperties {
  const v = clamp(value, 0, 100);
  const color =
    kind === "trust"
      ? "linear-gradient(90deg, rgba(52,211,153,0.95), rgba(56,189,248,0.85))"
      : "linear-gradient(90deg, rgba(251,113,133,0.95), rgba(168,85,247,0.85))";

  return {
    height: 10,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    overflow: "hidden",
    position: "relative",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
    ["--fill" as any]: `${v}%`,
    ["--grad" as any]: color,
  };
}

function meterFillStyle(): React.CSSProperties {
  return {
    height: "100%",
    width: "var(--fill)",
    background: "var(--grad)",
    borderRadius: 999,
    boxShadow: "0 10px 28px rgba(0,0,0,0.28)",
  };
}

function glowDot(color: string): React.CSSProperties {
  return {
    height: 8,
    width: 8,
    borderRadius: 999,
    background: color,
    boxShadow: `0 0 16px ${color}55`,
  };
}

function ChoiceCard({
  title,
  subtitle,
  risk,
  reward,
  hotkey,
  accent,
  disabled,
  onPick,
}: {
  title: string;
  subtitle: string;
  risk: string;
  reward: string;
  hotkey: string;
  accent: "teal" | "sky" | "amber" | "rose" | "purple";
  disabled?: boolean;
  onPick: () => void;
}) {
  const tone = useMemo(() => {
    switch (accent) {
      case "teal":
        return {
          border: "1px solid rgba(121,255,225,0.22)",
          wash:
            "radial-gradient(720px 220px at 10% 0%, rgba(121,255,225,0.14), transparent 60%), radial-gradient(700px 260px at 95% 15%, rgba(56,189,248,0.10), transparent 62%)",
          pill: "rgba(121,255,225,0.12)",
          pillBorder: "rgba(121,255,225,0.30)",
          pillText: "rgba(240,253,250,0.92)",
        };
      case "sky":
        return {
          border: "1px solid rgba(56,189,248,0.22)",
          wash:
            "radial-gradient(720px 220px at 10% 0%, rgba(56,189,248,0.14), transparent 60%), radial-gradient(700px 260px at 95% 15%, rgba(99,102,241,0.10), transparent 62%)",
          pill: "rgba(56,189,248,0.12)",
          pillBorder: "rgba(56,189,248,0.30)",
          pillText: "rgba(240,249,255,0.92)",
        };
      case "amber":
        return {
          border: "1px solid rgba(251,191,36,0.22)",
          wash:
            "radial-gradient(720px 220px at 10% 0%, rgba(251,191,36,0.14), transparent 60%), radial-gradient(700px 260px at 95% 15%, rgba(245,158,11,0.10), transparent 62%)",
          pill: "rgba(251,191,36,0.12)",
          pillBorder: "rgba(251,191,36,0.30)",
          pillText: "rgba(255,251,235,0.92)",
        };
      case "rose":
        return {
          border: "1px solid rgba(251,113,133,0.22)",
          wash:
            "radial-gradient(720px 220px at 10% 0%, rgba(251,113,133,0.14), transparent 60%), radial-gradient(700px 260px at 95% 15%, rgba(244,63,94,0.10), transparent 62%)",
          pill: "rgba(251,113,133,0.12)",
          pillBorder: "rgba(251,113,133,0.30)",
          pillText: "rgba(255,241,242,0.92)",
        };
      default:
        return {
          border: "1px solid rgba(168,85,247,0.20)",
          wash:
            "radial-gradient(720px 220px at 10% 0%, rgba(168,85,247,0.12), transparent 60%), radial-gradient(700px 260px at 95% 15%, rgba(56,189,248,0.10), transparent 62%)",
          pill: "rgba(168,85,247,0.12)",
          pillBorder: "rgba(168,85,247,0.30)",
          pillText: "rgba(250,245,255,0.92)",
        };
    }
  }, [accent]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className="group relative text-left w-full rounded-3xl p-4 md:p-5 transition active:scale-[0.99]"
      style={{
        border: tone.border,
        background: "rgba(0,0,0,0.22)",
        boxShadow: "0 26px 90px rgba(0,0,0,0.55)",
        opacity: disabled ? 0.6 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-95" style={{ background: tone.wash }} />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 left-0 right-0 h-28 opacity-40"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)",
          transform: "rotate(-6deg)",
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div
              className="inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-extrabold tracking-wide"
              style={{ borderColor: tone.pillBorder, background: tone.pill, color: tone.pillText }}
            >
              KEY {hotkey}
            </div>
            <div className="mt-2 text-[15px] md:text-[16px] font-extrabold" style={{ color: "rgba(255,255,255,0.94)" }}>
              {title}
            </div>
            <div className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.70)" }}>
              {subtitle}
            </div>
          </div>

          <div
            className="hidden md:flex items-center justify-center rounded-2xl border px-3 py-2 text-[10px] font-mono"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.20)",
              color: "rgba(255,255,255,0.64)",
            }}
          >
            /CHOICE
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          <div className="rounded-2xl border px-3 py-2" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
            <div className="text-[10px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
              RISK
            </div>
            <div className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.72)" }}>
              {risk}
            </div>
          </div>

          <div className="rounded-2xl border px-3 py-2" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
            <div className="text-[10px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.55)" }}>
              PAYOFF
            </div>
            <div className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,0.72)" }}>
              {reward}
            </div>
          </div>
        </div>

        <div className="mt-3 text-[11px]" style={{ color: "rgba(255,255,255,0.46)" }}>
          Tip: later we’ll commit this on-chain so it follows you across devices.
        </div>
      </div>
    </button>
  );
}

function AftermathPanel({ save }: { save: SaveShape }) {
  const { choiceId, artifact, flags } = save;

  const text = useMemo(() => {
    // Each aftermath is written to feel consequential and sets up Episode 2.
    if (choiceId === "ACCEPT") {
      return {
        header: "AFTERMATH // HANDSHAKE ACCEPTED",
        lines: [
          "The panel doesn’t thank you. It *records* you.",
          "A cold signature blooms across the room like frost on glass—your compliance translated into permission.",
          "The city’s lights sharpen. Doors you didn’t know existed relax their locks. Your Basebot’s posture changes like it’s been given a job.",
          "Then the air shifts. A second presence joins the channel—silent, observing, older than the directive.",
        ],
        hookTitle: "EPISODE 2 HOOK",
        hookLines: [
          "A new message arrives, not formatted like the first.",
          "It’s messy. Human.",
          "“You just made yourself easy to find.”",
          "Behind it, an address pings your wallet—one you never shared—like someone is standing outside your door and smiling.",
        ],
        sting: "You are now indexed.",
      };
    }

    if (choiceId === "STALL") {
      return {
        header: "AFTERMATH // DELAY LOOP ACTIVE",
        lines: [
          "You don’t answer. You watch.",
          "The directive twitches—micro-jitter in its timing, like a predator annoyed by still prey.",
          "Your Basebot’s optics dim. Not fear—*focus.* You let the system show its tells.",
          "A faint echo rides the signal: a second rhythm layered beneath the first, too clean to be accidental.",
        ],
        hookTitle: "EPISODE 2 HOOK",
        hookLines: [
          "Your UI flickers and resolves into something it shouldn’t have permission to render:",
          "a second choice panel—half-corrupted—bleeding through the first.",
          "A word appears for a single frame: “FRAGMENT.”",
          "Then the directive finally speaks again, softer: “We noticed you noticed.”",
        ],
        sting: "You are being measured.",
      };
    }

    if (choiceId === "SPOOF") {
      return {
        header: "AFTERMATH // SPOOF INJECTED",
        lines: [
          "You feed it a lie shaped like the truth.",
          "For a moment, it accepts. The room warms by half a degree. The chain feels almost… fooled.",
          "Then the light in the corners changes—like something turning its head.",
          "Your Basebot’s logs populate with entries you didn’t create. A handshake you never signed. A history that isn’t yours.",
        ],
        hookTitle: "EPISODE 2 HOOK",
        hookLines: [
          "The directive replies with a sentence that isn’t a sentence:",
          "a string of clean, identical symbols—machine laughter.",
          "Your artifact flashes hot in your inventory and a new system label appears with no explanation:",
          "“LIABILITY.”",
        ],
        sting: "You are now interesting.",
      };
    }

    // PULL_PLUG
    return {
      header: "AFTERMATH // LINK SEVERED",
      lines: [
        "You cut the channel.",
        "The panel dies mid-breath. The room goes quiet in a way that feels illegal.",
        "Your Basebot stands there with eyes still open—awake, but suddenly alone with you.",
        "In the silence, you realize something worse: the directive was never the only thing listening.",
      ],
      hookTitle: "EPISODE 2 HOOK",
      hookLines: [
        "A single block later, your UI renders a warning without the app’s permission.",
        "It’s not from the system you unplugged.",
        "It’s from something that survived the cut:",
        "“If you sever again, we sever *back.*”",
      ],
      sting: "Silence becomes a signal.",
    };
  }, [choiceId]);

  const tone = useMemo(() => {
    if (flags.complied) return { border: "rgba(52,211,153,0.22)", glow: "rgba(52,211,153,0.10)" };
    if (flags.cautious) return { border: "rgba(56,189,248,0.20)", glow: "rgba(56,189,248,0.10)" };
    if (flags.adversarial) return { border: "rgba(251,191,36,0.20)", glow: "rgba(251,191,36,0.10)" };
    return { border: "rgba(251,113,133,0.20)", glow: "rgba(251,113,133,0.10)" };
  }, [flags]);

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      <div
        className="rounded-3xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.62)" }}>
            {text.header}
          </div>
          <div
            className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold"
            style={{
              borderColor: tone.border,
              background: tone.glow,
              color: "rgba(255,255,255,0.86)",
            }}
          >
            {save.choiceId}
          </div>
        </div>

        <div className="mt-3 grid gap-2">
          {text.lines.map((l, i) => (
            <p key={i} className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              {l}
            </p>
          ))}
        </div>

        <div
          className="mt-4 rounded-2xl border px-3 py-2 text-[12px]"
          style={{
            borderColor: "rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.04)",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          <span style={{ color: "rgba(255,255,255,0.50)" }}>Artifact:</span>{" "}
          <span style={{ fontWeight: 800, color: "rgba(255,255,255,0.92)" }}>{artifact.name}</span>
          <div className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.62)" }}>
            {artifact.desc}
          </div>
        </div>
      </div>

      <div
        className="rounded-3xl border p-4"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          background: "rgba(0,0,0,0.22)",
        }}
      >
        <div className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.62)" }}>
          {text.hookTitle}
        </div>

        <div
          className="mt-3 rounded-3xl border p-4"
          style={{
            borderColor: tone.border,
            background:
              "radial-gradient(820px 280px at 20% 0%, rgba(168,85,247,0.14), transparent 60%), radial-gradient(760px 260px at 90% 20%, rgba(56,189,248,0.10), transparent 62%), rgba(255,255,255,0.04)",
          }}
        >
          <div className="grid gap-2">
            {text.hookLines.map((l, i) => (
              <p key={i} className="text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.74)" }}>
                {l}
              </p>
            ))}
          </div>

          <div
            className="mt-4 rounded-2xl border px-3 py-2 text-[12px]"
            style={{
              borderColor: "rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.20)",
              color: "rgba(255,255,255,0.78)",
            }}
          >
            <span style={{ color: "rgba(255,255,255,0.55)" }}>Cliffhanger:</span>{" "}
            <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.92)" }}>{text.sting}</span>
          </div>
        </div>

        <div className="mt-4 text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>
          Episode 2 will read your flags and artifact. Different players will see different scenes.
        </div>
      </div>
    </div>
  );
}

export default function EpisodeOne({ onExit }: { onExit: () => void }) {
  const existing = useMemo(() => loadFromLocal(), []);
  const [phase, setPhase] = useState<"intro" | "signal" | "choice" | "aftermath" | "result">(
    existing?.episodeId === "ep1" ? "result" : "intro",
  );

  const [secondsLeft, setSecondsLeft] = useState(18);
  const [picked, setPicked] = useState<EpisodeOneChoiceId | null>(existing?.choiceId ?? null);

  const [trust, setTrust] = useState(existing?.profile.trust ?? 50);
  const [threat, setThreat] = useState(existing?.profile.threat ?? 35);

  const [save, setSave] = useState<SaveShape | null>(existing);

  const defaultChoice: EpisodeOneChoiceId = "STALL";

  useEffect(() => {
    if (phase !== "choice") return;
    setSecondsLeft(18);

    const t = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [phase]);

  useEffect(() => {
    if (phase !== "choice") return;
    if (secondsLeft !== 0) return;
    resolveChoice(defaultChoice, { expired: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase]);

  useEffect(() => {
    if (phase !== "choice") return;

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "1") resolveChoice("ACCEPT");
      if (k === "2") resolveChoice("STALL");
      if (k === "3") resolveChoice("SPOOF");
      if (k === "4") resolveChoice("PULL_PLUG");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  function buildSave(choiceId: EpisodeOneChoiceId): SaveShape {
    const baseFlags = { complied: false, cautious: false, adversarial: false, severed: false };

    let profile: SaveShape["profile"] = { archetype: "Ghost", threat: 40, trust: 50 };
    let artifact: SaveShape["artifact"] = {
      name: "Null Cartridge",
      desc: "A clean casing with a warm core. It doesn’t match any known manufacturer.",
    };

    if (choiceId === "ACCEPT") {
      baseFlags.complied = true;
      profile = { archetype: "Operator", threat: 25, trust: 68 };
      artifact = {
        name: "Handshake Token",
        desc: "A one-time signature bound to your actions. It opens doors, and it leaves fingerprints.",
      };
    } else if (choiceId === "STALL") {
      baseFlags.cautious = true;
      profile = { archetype: "Ghost", threat: 38, trust: 54 };
      artifact = {
        name: "Delay Loop",
        desc: "A micro-glitch captured between blocks. It buys time—at a cost you can’t see yet.",
      };
    } else if (choiceId === "SPOOF") {
      baseFlags.adversarial = true;
      profile = { archetype: "Saboteur", threat: 72, trust: 28 };
      artifact = {
        name: "Spoof Key",
        desc: "A synthetic credential. Convincing enough to fool a machine… or provoke it.",
      };
    } else {
      baseFlags.severed = true;
      profile = { archetype: "Severed", threat: 55, trust: 18 };
      artifact = {
        name: "Cut Wire",
        desc: "You broke the link. The city noticed the silence. Silence becomes a signal too.",
      };
    }

    return {
      v: 1,
      episodeId: "ep1",
      choiceId,
      flags: baseFlags,
      profile,
      artifact,
      createdAt: Date.now(),
    };
  }

  function applyMeters(choiceId: EpisodeOneChoiceId) {
    if (choiceId === "ACCEPT") {
      setTrust(68);
      setThreat(25);
      return;
    }
    if (choiceId === "STALL") {
      setTrust(54);
      setThreat(38);
      return;
    }
    if (choiceId === "SPOOF") {
      setTrust(28);
      setThreat(72);
      return;
    }
    setTrust(18);
    setThreat(55);
  }

  function resolveChoice(choiceId: EpisodeOneChoiceId, _opts?: { expired?: boolean }) {
    setPicked(choiceId);
    applyMeters(choiceId);

    const nextSave = buildSave(choiceId);
    saveToLocal(nextSave);
    setSave(nextSave);

    // NEW: aftermath phase first
    setPhase("aftermath");
  }

  const scene = useMemo(() => {
    return {
      intro: {
        heading: "EPISODE 01 // AWAKENING PROTOCOL",
        body: [
          "A cold boot. No fan noise. No startup chime.",
          "Your Basebot opens its eyes in a room that doesn’t exist on any map—only in state transitions.",
          "The air tastes like ozone and old money. Somewhere below, vaults hum with rewards nobody has claimed yet.",
          "A cartridge slot clicks. Not in your hands—in your future.",
        ],
        prompt: "Continue",
      },
      signal: {
        heading: "INCOMING DIRECTIVE",
        body: [
          "A packet arrives with perfect formatting and no origin.",
          "The message does not ask. It instructs.",
          "The UI renders a choice panel you didn’t open.",
          "You feel a delay between your thought and the cursor—like the system is measuring you.",
        ],
        prompt: "Open the panel",
      },
      choice: {
        heading: "MAKE A DECISION",
        sub: "18 seconds. Not because the game wants urgency—because the network does.",
        warning: "If the timer hits zero, the system will interpret hesitation as intent and choose for you.",
      },
    };
  }, []);

  return (
    <section
      className="relative overflow-hidden rounded-[28px] border p-5 md:p-7"
      style={{
        borderColor: "rgba(255,255,255,0.10)",
        background: "linear-gradient(180deg, rgba(2,6,23,0.92), rgba(2,6,23,0.68))",
        boxShadow: "0 40px 140px rgba(0,0,0,0.78)",
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-95"
        style={{
          background:
            "radial-gradient(1100px 520px at 10% -30%, rgba(56,189,248,0.12), transparent 60%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.12), transparent 60%), radial-gradient(900px 520px at 20% 120%, rgba(251,113,133,0.08), transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(850px 360px at 50% 18%, black 42%, transparent 74%)",
          WebkitMaskImage: "radial-gradient(850px 360px at 50% 18%, black 42%, transparent 74%)",
        }}
      />

      <div className="relative">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-2">
            <div
              className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-extrabold tracking-wide"
              style={{
                borderColor: "rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                color: "rgba(255,255,255,0.74)",
              }}
            >
              CARTRIDGE INSERTED
            </div>
            <div
              className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold"
              style={{
                borderColor: "rgba(251,113,133,0.18)",
                background: "rgba(251,113,133,0.08)",
                color: "rgba(255,241,242,0.86)",
              }}
            >
              EPISODE 01
            </div>
          </div>

          <button
            type="button"
            onClick={onExit}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
            style={{
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.82)",
            }}
          >
            ← Exit to Hub
          </button>
        </div>

        {/* INTRO / SIGNAL */}
        {(phase === "intro" || phase === "signal") && (
          <div className="mt-6">
            <h2 className="text-[18px] md:text-[22px] font-extrabold tracking-tight" style={{ color: "rgba(255,255,255,0.94)" }}>
              {phase === "intro" ? scene.intro.heading : scene.signal.heading}
            </h2>

            <div className="mt-3 grid gap-2">
              {(phase === "intro" ? scene.intro.body : scene.signal.body).map((line, i) => (
                <p key={i} className="text-[13px] md:text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                  {line}
                </p>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {phase === "intro" ? (
                <button
                  type="button"
                  onClick={() => setPhase("signal")}
                  className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "linear-gradient(90deg, rgba(56,189,248,0.92), rgba(168,85,247,0.70))",
                    color: "rgba(2,6,23,0.98)",
                    boxShadow: "0 16px 50px rgba(56,189,248,0.14)",
                  }}
                >
                  {scene.intro.prompt}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setPhase("choice")}
                  className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "linear-gradient(90deg, rgba(251,113,133,0.92), rgba(168,85,247,0.72))",
                    color: "rgba(2,6,23,0.98)",
                    boxShadow: "0 16px 50px rgba(251,113,133,0.14)",
                  }}
                >
                  {scene.signal.prompt}
                </button>
              )}

              <div className="text-[11px] ml-1" style={{ color: "rgba(255,255,255,0.46)" }}>
                {phase === "signal" ? "If you feel watched, you are." : "The cartridge feels warm before you touch it."}
              </div>
            </div>
          </div>
        )}

        {/* CHOICE */}
        {phase === "choice" && (
          <div className="mt-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h2 className="text-[18px] md:text-[22px] font-extrabold tracking-tight" style={{ color: "rgba(255,255,255,0.94)" }}>
                  {scene.choice.heading}
                </h2>
                <div className="mt-2 text-[12px] md:text-[13px]" style={{ color: "rgba(255,255,255,0.70)" }}>
                  {scene.choice.sub}
                </div>

                <div
                  className="mt-3 rounded-2xl border px-3 py-2 text-[12px]"
                  style={{
                    borderColor: "rgba(251,113,133,0.18)",
                    background: "rgba(251,113,133,0.08)",
                    color: "rgba(255,241,242,0.86)",
                  }}
                >
                  {scene.choice.warning}
                </div>
              </div>

              <div
                className="w-full md:w-[360px] rounded-3xl border p-4"
                style={{
                  borderColor: "rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.22)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.62)" }}>
                    DECISION WINDOW
                  </div>
                  <div
                    className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold"
                    style={{
                      borderColor: "rgba(255,255,255,0.12)",
                      background: "rgba(255,255,255,0.06)",
                      color: secondsLeft <= 5 ? "rgba(255,241,242,0.92)" : "rgba(255,255,255,0.82)",
                    }}
                  >
                    {secondsLeft}s
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.62)" }}>
                    HOTKEYS
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.58)" }}>
                    1 Accept • 2 Stall • 3 Spoof • 4 Pull Plug
                  </div>

                  <div className="mt-3">
                    <div className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.62)" }}>
                      DEFAULT IF EXPIRED
                    </div>
                    <div
                      className="mt-1 rounded-2xl border px-3 py-2 text-[12px]"
                      style={{
                        borderColor: "rgba(56,189,248,0.20)",
                        background: "rgba(56,189,248,0.08)",
                        color: "rgba(240,249,255,0.88)",
                      }}
                    >
                      STALL — buy time
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <ChoiceCard
                hotkey="1"
                accent="teal"
                title="ACCEPT INITIALIZATION"
                subtitle="Answer the directive. Let the system see you comply."
                risk="You leave a clean fingerprint. The network can index you."
                reward="You gain access pathways: faster rewards, fewer locks, smoother approvals."
                onPick={() => resolveChoice("ACCEPT")}
              />
              <ChoiceCard
                hotkey="2"
                accent="sky"
                title="STALL THE DIRECTIVE"
                subtitle="Do not refuse. Do not comply. Watch the signal’s behavior."
                risk="The system may tag you as evasive. It hates ambiguity."
                reward="You capture timing data. You keep agency. You learn what’s behind the prompt."
                onPick={() => resolveChoice("STALL")}
              />
              <ChoiceCard
                hotkey="3"
                accent="amber"
                title="SPOOF A RESPONSE"
                subtitle="Feed it what it wants—without giving it you."
                risk="If it detects fraud, it escalates. It may punish you later."
                reward="You test its intelligence. You probe its rules. You may gain leverage."
                onPick={() => resolveChoice("SPOOF")}
              />
              <ChoiceCard
                hotkey="4"
                accent="rose"
                title="PULL THE PLUG"
                subtitle="Sever the link. Break the panel. Kill the handshake."
                risk="Silence is a signal. The city will notice what you refused to become."
                reward="You deny the system a narrative. For now, you keep yourself clean."
                onPick={() => resolveChoice("PULL_PLUG")}
              />
            </div>

            <div className="mt-6 text-center text-[11px]" style={{ color: "rgba(255,255,255,0.46)" }}>
              “The timer isn’t for drama. It’s for classification.”
            </div>
          </div>
        )}

        {/* AFTERMATH */}
        {phase === "aftermath" && save && (
          <div className="mt-6">
            {/* meters */}
            <div className="grid gap-4 md:grid-cols-2">
              <div
                className="rounded-3xl border p-4"
                style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.22)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.62)" }}>
                    PLAYER METRICS
                  </div>
                  <div
                    className="rounded-full border px-2.5 py-1 text-[10px] font-extrabold"
                    style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.84)" }}
                  >
                    {save.profile.archetype.toUpperCase()}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.60)" }}>
                      <span className="flex items-center gap-2">
                        <span style={glowDot("rgba(52,211,153,0.95)")} />
                        TRUST
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.78)" }}>{trust}</span>
                    </div>
                    <div style={meterStyle("trust", trust)}>
                      <div style={meterFillStyle()} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.60)" }}>
                      <span className="flex items-center gap-2">
                        <span style={glowDot("rgba(251,113,133,0.95)")} />
                        THREAT
                      </span>
                      <span style={{ color: "rgba(255,255,255,0.78)" }}>{threat}</span>
                    </div>
                    <div style={meterStyle("threat", threat)}>
                      <div style={meterFillStyle()} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                  These values are story-state. Episode 2 will branch on them.
                </div>
              </div>

              <div
                className="rounded-3xl border p-4"
                style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.22)" }}
              >
                <div className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.62)" }}>
                  SAVE COMMITTED
                </div>

                <div className="mt-3 rounded-2xl border p-3" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.04)" }}>
                  <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.80)" }}>
                    Choice: <span style={{ fontWeight: 900, color: "rgba(255,255,255,0.94)" }}>{save.choiceId}</span>
                  </div>
                  <div className="mt-1 text-[11px]" style={{ color: "rgba(255,255,255,0.60)" }}>
                    Stored locally now. When we enable on-chain save, this becomes a signed tx.
                  </div>
                </div>

                <div className="mt-3 grid gap-2">
                  <div className="rounded-2xl border px-3 py-2 text-[11px]" style={{ borderColor: "rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.18)", color: "rgba(255,255,255,0.70)" }}>
                    Flags:{" "}
                    <span style={{ color: "rgba(255,255,255,0.88)", fontWeight: 800 }}>
                      {Object.entries(save.flags)
                        .filter(([, v]) => v)
                        .map(([k]) => k)
                        .join(", ") || "none"}
                    </span>
                  </div>
                </div>

                <div className="mt-4 text-[11px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                  You can later display these in the hub as “path markers”.
                </div>
              </div>
            </div>

            {/* Dynamic aftermath + hook */}
            <AftermathPanel save={save} />

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPhase("result")}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "linear-gradient(90deg, rgba(168,85,247,0.92), rgba(56,189,248,0.86))",
                  color: "rgba(2,6,23,0.98)",
                  boxShadow: "0 16px 50px rgba(168,85,247,0.12)",
                }}
              >
                Continue →
              </button>

              <button
                type="button"
                onClick={() => setPhase("choice")}
                className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.84)",
                }}
              >
                Re-open choice panel
              </button>

              <div className="text-[11px] ml-1" style={{ color: "rgba(255,255,255,0.46)" }}>
                “The city doesn’t punish. It reassigns.”
              </div>
            </div>
          </div>
        )}

        {/* RESULT (final screen) */}
        {phase === "result" && save && (
          <div className="mt-6">
            <div
              className="rounded-3xl border p-5 md:p-6"
              style={{
                borderColor: "rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.22)",
              }}
            >
              <div className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(255,255,255,0.62)" }}>
                EPISODE COMPLETE
              </div>

              <div className="mt-2 text-[16px] md:text-[18px] font-extrabold" style={{ color: "rgba(255,255,255,0.92)" }}>
                You survived the first prompt.
              </div>

              <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "rgba(255,255,255,0.70)" }}>
                Episode 2 will begin where the signal fractures—where your choice stops being a decision and becomes a
                reputation.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onExit}
                  className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "linear-gradient(90deg, rgba(52,211,153,0.92), rgba(56,189,248,0.82))",
                    color: "rgba(2,6,23,0.98)",
                    boxShadow: "0 16px 50px rgba(52,211,153,0.12)",
                  }}
                >
                  Return to Hub
                </button>

                <button
                  type="button"
                  onClick={() => {
                    try {
                      localStorage.removeItem(STORAGE_KEY);
                    } catch {}
                    setSave(null);
                    setPicked(null);
                    setTrust(50);
                    setThreat(35);
                    setPhase("intro");
                  }}
                  className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "rgba(255,255,255,0.84)",
                  }}
                >
                  Reset Episode (admin)
                </button>

                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.46)" }}>
                  “A saved choice is a future you can’t deny.”
                </div>
              </div>
            </div>
          </div>
        )}

        {/* If user already has a save, show them result immediately */}
        {phase === "result" && !save && (
          <div className="mt-6 text-[12px]" style={{ color: "rgba(255,255,255,0.70)" }}>
            No save found yet.
          </div>
        )}
      </div>
    </section>
  );
}
