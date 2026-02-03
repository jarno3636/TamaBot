"use client";

import * as React from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "radial-gradient(1200px 600px at 50% -200px, #0b1224, #020617)",
        color: "white",
        padding: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: 760,
          width: "100%",
          borderRadius: 24,
          padding: 20,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 18, letterSpacing: 0.6 }}>
          Story route crashed
        </div>
        <div style={{ opacity: 0.75, marginTop: 6, lineHeight: 1.5 }}>
          This is a client-side exception. Tap reset to reload the hub without losing the rest of the app.
        </div>

        <div
          style={{
            marginTop: 14,
            borderRadius: 16,
            padding: 12,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.12)",
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 12,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {error?.message || "Unknown error"}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ""}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <button
            onClick={reset}
            style={{
              borderRadius: 14,
              padding: "10px 14px",
              border: "1px solid rgba(168,85,247,0.45)",
              background:
                "linear-gradient(180deg, rgba(168,85,247,0.30), rgba(99,102,241,0.18))",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Reset Story
          </button>

          <Link
            href="/"
            style={{
              borderRadius: 14,
              padding: "10px 14px",
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(2,6,23,0.45)",
              color: "white",
              fontWeight: 900,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            Back to Mint
          </Link>
        </div>

        <div style={{ marginTop: 12, opacity: 0.65, fontSize: 12, lineHeight: 1.5 }}>
          If this keeps happening, it’s almost always one of the episode components throwing during import.
          This error screen confirms it and keeps navigation usable.
        </div>
      </div>
    </main>
  );
}
