"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useMemo, useState } from "react";
import useFid from "@/hooks/useFid";

/* ────────────────────────────────────────────── */
/* Lazy loaded story modules */
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
const EpisodeTwo = dynamic(() => import("./EpisodeTwo"), { ssr:false })
etc
*/

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

type Mode =
  | "hub"
  | "prologue"
  | "ep1";

type EpisodeStatus = "locked" | "available" | "complete";

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function StoryClient() {
  const { fid } = useFid(); // ✅ single source of truth
  const [mode, setMode] = useState<Mode>("hub");

  const hasFid = useMemo(
    () =>
      fid !== undefined &&
      fid !== null &&
      Number.isFinite(Number(fid)) &&
      Number(fid) > 0,
    [fid]
  );

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

    return (
      <EpisodeOne
        fid={fid!}
        onExit={() => setMode("hub")}
      />
    );
  }

  /* ─────────────────────────────── */
  /* HUB */
  /* ─────────────────────────────── */

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <h1 style={title}>STORY ARCHIVE</h1>
          <p style={subtitle}>
            Identity:{" "}
            <b>{hasFid ? `FID ${fid}` : "NOT DETECTED"}</b>
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
            status={hasFid ? "available" : "locked"}
            badge={hasFid ? "CORE MEMORY READY" : "IDENTITY REQUIRED"}
            onClick={() => hasFid && setMode("ep1")}
          />

          <EpisodeCard
            title="EPISODE II"
            subtitle="Designation"
            image="/story/ep2.png"
            status="locked"
            badge="NOT INITIALIZED"
          />

          <EpisodeCard
            title="EPISODE III"
            subtitle="Cognitive Frame"
            image="/story/ep3.png"
            status="locked"
            badge="LOCKED"
          />

          <EpisodeCard
            title="EPISODE IV"
            subtitle="Surface Profile"
            image="/story/ep4.png"
            status="locked"
            badge="LOCKED"
          />

          <EpisodeCard
            title="EPISODE V"
            subtitle="Outcome"
            image="/story/ep5.png"
            status="locked"
            badge="LOCKED"
          />
        </section>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Episode Card */
/* ────────────────────────────────────────────── */

function EpisodeCard({
  title,
  subtitle,
  image,
  status,
  badge,
  onClick,
}: {
  title: string;
  subtitle: string;
  image: string;
  status: EpisodeStatus;
  badge: string;
  onClick?: () => void;
}) {
  const disabled = status === "locked";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...card,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div style={glow} />
      <Image
        src={image}
        alt={title}
        width={600}
        height={340}
        style={img}
      />

      <div style={cardBody}>
        <div style={badgeStyle}>{badge}</div>
        <h3 style={cardTitle}>{title}</h3>
        <p style={cardSubtitle}>{subtitle}</p>
      </div>
    </button>
  );
}

/* ────────────────────────────────────────────── */
/* Missing Identity */
/* ────────────────────────────────────────────── */

function MissingIdentity({ onBack }: { onBack: () => void }) {
  return (
    <main style={page}>
      <div style={missingCard}>
        <h2 style={{ fontWeight: 900 }}>IDENTITY REQUIRED</h2>
        <p style={{ opacity: 0.85, marginTop: 10 }}>
          This episode writes to chain and requires a valid Farcaster identity.
        </p>
        <button style={btn} onClick={onBack}>
          Return to Archive
        </button>
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */
/* ────────────────────────────────────────────── */

const page = {
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 24,
};

const container = {
  maxWidth: 1200,
  margin: "0 auto",
};

const header = {
  marginBottom: 28,
};

const title = {
  fontSize: 36,
  fontWeight: 950,
  letterSpacing: 1,
};

const subtitle = {
  opacity: 0.7,
  marginTop: 6,
};

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
  gap: 20,
};

const card = {
  position: "relative" as const,
  borderRadius: 22,
  background: "rgba(2,6,23,0.85)",
  border: "1px solid rgba(168,85,247,0.45)",
  overflow: "hidden",
  boxShadow: "0 0 40px rgba(168,85,247,0.35)",
  textAlign: "left" as const,
};

const glow = {
  position: "absolute" as const,
  inset: -2,
  background:
    "linear-gradient(120deg, rgba(168,85,247,.35), rgba(56,189,248,.15), rgba(168,85,247,.35))",
  filter: "blur(18px)",
  opacity: 0.45,
  pointerEvents: "none" as const,
};

const img = {
  width: "100%",
  height: 160,
  objectFit: "cover" as const,
};

const cardBody = {
  padding: 16,
};

const badgeStyle = {
  fontSize: 11,
  fontWeight: 900,
  letterSpacing: 1.4,
  padding: "6px 10px",
  borderRadius: 999,
  display: "inline-block",
  background: "rgba(168,85,247,0.15)",
  border: "1px solid rgba(168,85,247,0.45)",
  boxShadow: "0 0 16px rgba(168,85,247,0.35)",
};

const cardTitle = {
  marginTop: 12,
  fontSize: 18,
  fontWeight: 900,
};

const cardSubtitle = {
  marginTop: 6,
  fontSize: 13,
  opacity: 0.75,
};

const missingCard = {
  maxWidth: 520,
  margin: "0 auto",
  padding: 28,
  borderRadius: 22,
  border: "1px solid rgba(168,85,247,0.45)",
  background: "rgba(2,6,23,0.9)",
  textAlign: "center" as const,
  boxShadow: "0 0 40px rgba(168,85,247,0.35)",
};

const btn = {
  marginTop: 18,
  padding: "12px 16px",
  borderRadius: 14,
  fontWeight: 900,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
};
