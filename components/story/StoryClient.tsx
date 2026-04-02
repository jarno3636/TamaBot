"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import useFid from "@/hooks/useFid";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Lazy-loaded episodes */
/* ────────────────────────────────────────────── */

const Prologue = dynamic(
  () => import("@/components/story/PrologueSilenceInDarkness"),
  { ssr: false }
);

const EpisodeOne = dynamic(
  () => import("@/components/story/EpisodeOne"),
  { ssr: false }
);

/* later
const EpisodeTwo = dynamic(...)
const EpisodeThree = dynamic(...)
const EpisodeFour = dynamic(...)
const EpisodeFive = dynamic(...)
*/

type Mode = "hub" | "prologue" | "ep1";

type EpisodeStatus = "locked" | "available" | "complete";

type BotState = {
  ep1Set: boolean;
  ep2Set: boolean;
  ep3Set: boolean;
  ep4Set: boolean;
  ep5Set: boolean;
  finalized: boolean;
};

type EpisodeCardProps = {
  title: string;
  subtitle: string;
  image: string;
  status: EpisodeStatus;
  badge: string;
  onClick?: () => void;
};

type MissingIdentityProps = {
  onBack: () => void;
};

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function StoryClient() {
  const { fid } = useFid();
  const publicClient = usePublicClient();

  const [mode, setMode] = useState<Mode>("hub");
  const [botState, setBotState] = useState<BotState | null>(null);
  const [bonusEchoUnlocked, setBonusEchoUnlocked] = useState(false);
  const [bonusArchiveUnlocked, setBonusArchiveUnlocked] = useState(false);

  /* ───────── Identity ───────── */

  const hasFid = useMemo(() => {
    return (
      fid !== undefined &&
      fid !== null &&
      Number.isFinite(Number(fid)) &&
      Number(fid) > 0
    );
  }, [fid]);

  /* ───────── Hub Ambient Audio ───────── */

  const hubAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mode !== "hub") {
      hubAudioRef.current?.pause();
      return;
    }

    const audio = new Audio("/audio/hub.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    hubAudioRef.current = audio;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
      hubAudioRef.current = null;
    };
  }, [mode]);

  /* ───────── Read on-chain progress ───────── */

  useEffect(() => {
    if (!publicClient || !hasFid || fid == null) return;

    let cancelled = false;

    (async () => {
      try {
        const s = (await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [BigInt(fid)],
        })) as BotState;

        if (cancelled) return;

        setBotState({
          ep1Set: Boolean(s.ep1Set),
          ep2Set: Boolean(s.ep2Set),
          ep3Set: Boolean(s.ep3Set),
          ep4Set: Boolean(s.ep4Set),
          ep5Set: Boolean(s.ep5Set),
          finalized: Boolean(s.finalized),
        });
      } catch {
        if (!cancelled) {
          setBotState(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, fid, hasFid]);

  /* ───────── Bonus keys (localStorage only) ───────── */

  useEffect(() => {
    if (typeof window === "undefined") return;

    setBonusEchoUnlocked(
      window.localStorage.getItem("basebots_bonus_echo") === "true"
    );
    setBonusArchiveUnlocked(
      window.localStorage.getItem("basebots_bonus_archive") === "true"
    );
  }, []);

  /* ─────────────────────────────── */
  /* ROUTES */
  /* ─────────────────────────────── */

  if (mode === "prologue") {
    return <Prologue onExit={() => setMode("hub")} />;
  }

  if (mode === "ep1") {
    if (!hasFid) {
      return <MissingIdentity onBack={() => setMode("hub")} />;
    }

    return <EpisodeOne fid={fid!} onExit={() => setMode("hub")} />;
  }

  /* ─────────────────────────────── */
  /* HUB */
  /* ─────────────────────────────── */

  return (
    <main style={page}>
      <div style={ambientGlowA} />
      <div style={ambientGlowB} />

      <div style={container}>
        <header style={header}>
          <div style={eyebrow}>BASEBOTS // MEMORY VAULT</div>
          <h1 style={title}>STORY ARCHIVE</h1>
          <p style={subtitle}>
            Identity: <b>{hasFid ? `FID ${fid}` : "NOT DETECTED"}</b>
          </p>
        </header>

        <section style={grid}>
          <EpisodeCard
            title="PROLOGUE"
            subtitle="Silence in Darkness"
            image="/story/prologue.png"
            status="available"
            badge="ARCHIVE ENTRY"
            onClick={() => setMode("prologue")}
          />

          <EpisodeCard
            title="EPISODE I"
            subtitle="Awakening"
            image="/story/01-awakening.png"
            status={botState?.ep1Set ? "complete" : "available"}
            badge={
              botState?.ep1Set
                ? "CORE MEMORY INITIALIZED"
                : "CORE MEMORY READY"
            }
            onClick={() => setMode("ep1")}
          />

          <EpisodeCard
            title="EPISODE II"
            subtitle="Designation"
            image="/story/ep2.png"
            status={
              botState?.ep2Set
                ? "complete"
                : botState?.ep1Set
                  ? "available"
                  : "locked"
            }
            badge={botState?.ep2Set ? "DESIGNATION ASSIGNED" : "LOCKED"}
          />

          <EpisodeCard
            title="EPISODE III"
            subtitle="Cognitive Frame"
            image="/story/ep3.png"
            status={
              botState?.ep3Set
                ? "complete"
                : botState?.ep2Set
                  ? "available"
                  : "locked"
            }
            badge={botState?.ep3Set ? "BIAS RECORDED" : "LOCKED"}
          />

          <EpisodeCard
            title="EPISODE IV"
            subtitle="Surface Profile"
            image="/story/ep4.png"
            status={
              botState?.ep4Set
                ? "complete"
                : botState?.ep3Set
                  ? "available"
                  : "locked"
            }
            badge={botState?.ep4Set ? "PROFILE LOCKED" : "LOCKED"}
          />

          <EpisodeCard
            title="EPISODE V"
            subtitle="Outcome"
            image="/story/ep5.png"
            status={
              botState?.finalized
                ? "complete"
                : botState?.ep4Set
                  ? "available"
                  : "locked"
            }
            badge={botState?.finalized ? "OUTCOME FINALIZED" : "LOCKED"}
          />

          {bonusEchoUnlocked && (
            <EpisodeCard
              title="BONUS ECHO"
              subtitle="Residual Signal"
              image="/story/b1.png"
              status="available"
              badge="ANOMALY DETECTED"
            />
          )}

          {bonusArchiveUnlocked && (
            <EpisodeCard
              title="ARCHIVE ECHO"
              subtitle="Post-Final Memory"
              image="/story/b2.png"
              status="available"
              badge="ARCHIVE UNLOCKED"
            />
          )}
        </section>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Missing identity state */
/* ────────────────────────────────────────────── */

function MissingIdentity({ onBack }: MissingIdentityProps) {
  return (
    <main style={page}>
      <div style={ambientGlowA} />
      <div style={ambientGlowB} />

      <div style={missingWrap}>
        <div style={missingCard}>
          <div style={warningBadge}>IDENTITY REQUIRED</div>
          <h2 style={missingTitle}>No Farcaster identity detected</h2>
          <p style={missingText}>
            Episode I needs a valid FID before memory initialization can begin.
            Open this inside your Farcaster mini app context or connect the flow
            that provides identity first.
          </p>

          <div style={missingActions}>
            <button type="button" onClick={onBack} style={primaryButton}>
              Return to Archive
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Episode card */
/* ────────────────────────────────────────────── */

function EpisodeCard({
  title,
  subtitle,
  image,
  status,
  badge,
  onClick,
}: EpisodeCardProps) {
  const locked = status === "locked";
  const clickable = Boolean(onClick) && !locked;

  return (
    <button
      type="button"
      onClick={clickable ? onClick : undefined}
      disabled={!clickable}
      style={{
        ...card,
        ...(clickable ? cardInteractive : {}),
        ...(locked ? cardLocked : {}),
      }}
    >
      <div style={imageWrap}>
        <Image
          src={image}
          alt={`${title} cover`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          style={{
            objectFit: "cover",
            opacity: locked ? 0.45 : 0.92,
          }}
        />
        <div style={imageOverlay} />
        <div
          style={{
            ...statusPill,
            ...(status === "complete"
              ? statusComplete
              : status === "available"
                ? statusAvailable
                : statusLocked),
          }}
        >
          {status.toUpperCase()}
        </div>
      </div>

      <div style={cardBody}>
        <div style={cardTitle}>{title}</div>
        <div style={cardSubtitle}>{subtitle}</div>
        <div style={cardBadge}>{badge}</div>
      </div>
    </button>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */
/* ────────────────────────────────────────────── */

const page: React.CSSProperties = {
  minHeight: "100dvh",
  position: "relative",
  overflow: "hidden",
  background:
    "radial-gradient(circle at top, rgba(34,211,238,0.08), transparent 30%), linear-gradient(180deg, #030712 0%, #050816 40%, #02040a 100%)",
  color: "#e5f7ff",
};

const ambientGlowA: React.CSSProperties = {
  position: "absolute",
  width: 420,
  height: 420,
  borderRadius: "50%",
  filter: "blur(80px)",
  background: "rgba(34,211,238,0.10)",
  top: -120,
  left: -100,
  pointerEvents: "none",
};

const ambientGlowB: React.CSSProperties = {
  position: "absolute",
  width: 360,
  height: 360,
  borderRadius: "50%",
  filter: "blur(90px)",
  background: "rgba(168,85,247,0.10)",
  bottom: -120,
  right: -80,
  pointerEvents: "none",
};

const container: React.CSSProperties = {
  position: "relative",
  zIndex: 1,
  width: "100%",
  maxWidth: 1240,
  margin: "0 auto",
  padding: "40px 20px 64px",
};

const header: React.CSSProperties = {
  marginBottom: 28,
};

const eyebrow: React.CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.22em",
  color: "rgba(180, 230, 255, 0.72)",
  marginBottom: 10,
};

const title: React.CSSProperties = {
  margin: 0,
  fontSize: "clamp(2rem, 4vw, 3.5rem)",
  lineHeight: 1,
  letterSpacing: "0.08em",
  fontWeight: 800,
  color: "#f4fbff",
  textShadow: "0 0 24px rgba(34,211,238,0.16)",
};

const subtitle: React.CSSProperties = {
  marginTop: 12,
  marginBottom: 0,
  fontSize: 14,
  color: "rgba(215, 240, 255, 0.78)",
};

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 18,
};

const card: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  textAlign: "left",
  borderRadius: 24,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
  boxShadow:
    "0 12px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)",
  padding: 0,
  color: "inherit",
  cursor: "default",
  transition: "transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease",
  backdropFilter: "blur(12px)",
};

const cardInteractive: React.CSSProperties = {
  cursor: "pointer",
};

const cardLocked: React.CSSProperties = {
  opacity: 0.7,
};

const imageWrap: React.CSSProperties = {
  position: "relative",
  width: "100%",
  aspectRatio: "16 / 10",
  background: "#0a1324",
};

const imageOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(5,10,18,0.00) 35%, rgba(5,10,18,0.55) 100%)",
};

const statusPill: React.CSSProperties = {
  position: "absolute",
  top: 12,
  right: 12,
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  border: "1px solid rgba(255,255,255,0.18)",
  backdropFilter: "blur(8px)",
};

const statusAvailable: React.CSSProperties = {
  color: "#c8fff5",
  background: "rgba(16,185,129,0.18)",
};

const statusComplete: React.CSSProperties = {
  color: "#d7f5ff",
  background: "rgba(59,130,246,0.20)",
};

const statusLocked: React.CSSProperties = {
  color: "#ffd8d8",
  background: "rgba(244,63,94,0.16)",
};

const cardBody: React.CSSProperties = {
  padding: 16,
};

const cardTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  letterSpacing: "0.06em",
  color: "#f4fbff",
};

const cardSubtitle: React.CSSProperties = {
  marginTop: 6,
  fontSize: 14,
  color: "rgba(220,240,255,0.78)",
};

const cardBadge: React.CSSProperties = {
  marginTop: 14,
  display: "inline-block",
  fontSize: 11,
  letterSpacing: "0.08em",
  color: "rgba(160, 230, 255, 0.9)",
};

const missingWrap: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 20,
  position: "relative",
  zIndex: 1,
};

const missingCard: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  borderRadius: 28,
  padding: 28,
  border: "1px solid rgba(255,255,255,0.10)",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
  boxShadow:
    "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
  backdropFilter: "blur(14px)",
};

const warningBadge: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  color: "#ffe3e3",
  background: "rgba(244,63,94,0.16)",
  border: "1px solid rgba(244,63,94,0.30)",
};

const missingTitle: React.CSSProperties = {
  marginTop: 16,
  marginBottom: 0,
  fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
  lineHeight: 1.05,
  color: "#f4fbff",
};

const missingText: React.CSSProperties = {
  marginTop: 14,
  marginBottom: 0,
  fontSize: 15,
  lineHeight: 1.65,
  color: "rgba(220,240,255,0.80)",
};

const missingActions: React.CSSProperties = {
  marginTop: 22,
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const primaryButton: React.CSSProperties = {
  border: "1px solid rgba(121,255,225,0.35)",
  background:
    "linear-gradient(135deg, rgba(121,255,225,0.22), rgba(56,189,248,0.18))",
  color: "#efffff",
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
  boxShadow: "0 10px 30px rgba(56,189,248,0.10)",
};
