"use client";

import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Enum labels (MUST MATCH CONTRACT ORDER)
 * ────────────────────────────────────────────── */

// ep1Counts[5]
const EP1_LABELS = [
  "ACCEPT",
  "STALL",
  "SPOOF",
  "PULL_PLUG",
  "UNSET",
];

// biasCounts[5]
const BIAS_LABELS = [
  "DETERMINISTIC",
  "ARCHIVAL",
  "PRAGMATIC",
  "PARANOID",
  "UNSET",
];

// profileCounts[5]
const PROFILE_LABELS = [
  "EXECUTOR",
  "OBSERVER",
  "OPERATOR",
  "SENTINEL",
  "UNSET",
];

// outcomeCounts[6]
const OUTCOME_LABELS = [
  "AUTHORIZED",
  "OBSERVED",
  "SILENT",
  "UNTRACKED",
  "FLAGGED",
  "UNSET",
];

/* ──────────────────────────────────────────────
 * Component
 * ────────────────────────────────────────────── */

export default function GlobalStatsPanel() {
  const publicClient = usePublicClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<{
    totalFinalized: bigint;
    ep1Counts: readonly bigint[];
    biasCounts: readonly bigint[];
    profileCounts: readonly bigint[];
    outcomeCounts: readonly bigint[];
  } | null>(null);

  async function fetchStats() {
    if (!publicClient) return;
    setLoading(true);
    setError(null);

    try {
      const res = (await publicClient.readContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "getGlobalStats",
      })) as any;

      setStats({
        totalFinalized: res[0],
        ep1Counts: res[1],
        biasCounts: res[2],
        profileCounts: res[3],
        outcomeCounts: res[4],
      });
    } catch (e: any) {
      setError("Failed to load global stats");
    } finally {
      setLoading(false);
    }
  }

  /* ───────── initial + live refresh ───────── */
  useEffect(() => {
    fetchStats();

    const handler = () => fetchStats();
    window.addEventListener("basebots-progress-updated", handler);
    return () => window.removeEventListener("basebots-progress-updated", handler);
  }, [publicClient]);

  /* ────────────────────────────────────────────── */

  return (
    <section
      role="region"
      aria-label="Global Basebots Statistics"
      style={{
        borderRadius: 28,
        padding: 24,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "radial-gradient(900px 420px at 50% -10%, rgba(56,189,248,0.08), transparent 60%), linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.78))",
        boxShadow: "0 60px 220px rgba(0,0,0,0.9)",
        color: "white",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1 }}>
            GLOBAL INTERPRETATION METRICS
          </h3>
          <div style={{ fontSize: 11, opacity: 0.6 }}>
            Aggregated, irreversible outcomes across all Basebots
          </div>
        </div>

        <button
          onClick={fetchStats}
          disabled={loading}
          style={{
            borderRadius: 999,
            padding: "6px 14px",
            fontSize: 11,
            fontWeight: 800,
            border: "1px solid rgba(255,255,255,0.2)",
            background: "rgba(255,255,255,0.05)",
            color: "white",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "REFRESHING…" : "REFRESH"}
        </button>
      </div>

      {error && (
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.35)",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {!stats ? (
        <div style={{ marginTop: 24, fontSize: 12, opacity: 0.7 }}>
          Loading global state…
        </div>
      ) : (
        <>
          {/* TOTAL */}
          <div
            style={{
              marginTop: 24,
              borderRadius: 20,
              padding: 16,
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(255,255,255,0.18)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.6 }}>
              FINALIZED PROFILES
            </div>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {stats.totalFinalized.toString()}
            </div>
          </div>

          {/* GRIDS */}
          <div
            style={{
              marginTop: 26,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <StatBlock title="EP1 DIRECTIVES" labels={EP1_LABELS} values={stats.ep1Counts} />
            <StatBlock title="COGNITION BIASES" labels={BIAS_LABELS} values={stats.biasCounts} />
            <StatBlock title="SURFACE PROFILES" labels={PROFILE_LABELS} values={stats.profileCounts} />
            <StatBlock title="FINAL OUTCOMES" labels={OUTCOME_LABELS} values={stats.outcomeCounts} />
          </div>
        </>
      )}
    </section>
  );
}

/* ──────────────────────────────────────────────
 * Subcomponent
 * ────────────────────────────────────────────── */

function StatBlock({
  title,
  labels,
  values,
}: {
  title: string;
  labels: string[];
  values: readonly bigint[];
}) {
  return (
    <div
      style={{
        borderRadius: 20,
        padding: 14,
        background: "rgba(0,0,0,0.32)",
        border: "1px solid rgba(255,255,255,0.14)",
      }}
    >
      <div style={{ fontSize: 11, letterSpacing: 2, opacity: 0.65 }}>
        {title}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        {labels.map((label, i) => (
          <div
            key={label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: 12,
            }}
          >
            <span style={{ opacity: 0.75 }}>{label}</span>
            <span style={{ fontWeight: 800 }}>
              {values?.[i]?.toString?.() ?? "0"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
