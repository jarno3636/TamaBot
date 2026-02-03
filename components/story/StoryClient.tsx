"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useState } from "react";
import useFid from "@/hooks/useFid";

/**
 * Lazy load EVERYTHING so a single bad component
 * cannot crash the route on load
 */
const Prologue = dynamic(
  () => import("@/components/story/PrologueSilenceInDarkness"),
  { ssr: false }
);

const EpisodeOne = dynamic(
  () => import("@/components/story/EpisodeOne"),
  { ssr: false }
);

type Mode = "hub" | "prologue" | "ep1";

export default function StoryClient() {
  const { fid } = useFid(); // ✅ SINGLE SOURCE OF TRUTH
  const [mode, setMode] = useState<Mode>("hub");

  const hasFid =
    fid !== undefined &&
    fid !== null &&
    Number.isFinite(Number(fid)) &&
    Number(fid) > 0;

  /* ─────────────────────────────── */
  /* Route rendering */
  /* ─────────────────────────────── */

  if (mode === "prologue") {
    return <Prologue onExit={() => setMode("hub")} />;
  }

  if (mode === "ep1") {
    if (!hasFid) {
      return (
        <MissingIdentity
          onBack={() => setMode("hub")}
        />
      );
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
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          Story Hub
        </h1>

        <p style={{ opacity: 0.7, marginTop: 8 }}>
          Identity:{" "}
          <b>{hasFid ? `FID ${fid}` : "Not detected"}</b>
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <button
            onClick={() => setMode("prologue")}
            style={btn}
          >
            Open Prologue
          </button>

          <button
            onClick={() => setMode("ep1")}
            style={{
              ...btn,
              opacity: hasFid ? 1 : 0.4,
            }}
            disabled={!hasFid}
          >
            Open Episode One
          </button>
        </div>
      </div>
    </main>
  );
}

/* ─────────────────────────────── */
/* Missing Identity Guard */
/* ─────────────────────────────── */

function MissingIdentity({ onBack }: { onBack: () => void }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        padding: 24,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          padding: 24,
          borderRadius: 20,
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.15)",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontWeight: 900 }}>
          Identity Required
        </h2>

        <p style={{ opacity: 0.8, marginTop: 10 }}>
          This episode writes to chain and requires
          a valid Farcaster identity (FID).
        </p>

        <button
          onClick={onBack}
          style={{ ...btn, marginTop: 16 }}
        >
          Return to hub
        </button>
      </div>
    </main>
  );
}

const btn: React.CSSProperties = {
  borderRadius: 14,
  padding: "12px 16px",
  fontWeight: 900,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
};
