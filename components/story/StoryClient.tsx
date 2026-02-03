"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useState } from "react";

/**
 * Lazy load EVERYTHING so a single bad component
 * cannot crash the route on load
 */
const Prologue = dynamic(
  () => import("@/components/story/PrologueSilenceInDarkness"),
  { ssr: false },
);

const EpisodeOne = dynamic(
  () => import("@/components/story/EpisodeOne"),
  { ssr: false },
);

type Mode = "hub" | "prologue" | "ep1";

export default function StoryClient() {
  const [mode, setMode] = useState<Mode>("hub");

  if (mode === "prologue") {
    return <Prologue onExit={() => setMode("hub")} />;
  }

  if (mode === "ep1") {
    return <EpisodeOne onExit={() => setMode("hub")} />;
  }

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
          Story Hub (No FID / No Chain)
        </h1>

        <p style={{ opacity: 0.7, marginTop: 8 }}>
          This is a diagnostic build. If this crashes, the issue is not FID.
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
            style={btn}
          >
            Open Episode One
          </button>
        </div>
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
