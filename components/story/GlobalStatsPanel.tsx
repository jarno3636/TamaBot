"use client";

import React, { useMemo } from "react";
import { useReadContract } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

function fmt(n: bigint | number | undefined) {
  if (n === undefined) return "—";
  const asNum = typeof n === "bigint" ? Number(n) : n;
  if (!Number.isFinite(asNum)) return "—";
  return asNum.toLocaleString();
}

function asBigintArray(v: unknown, len: number): bigint[] {
  if (!Array.isArray(v)) return Array.from({ length: len }, () => 0n);
  const out = v.slice(0, len).map((x) => {
    try {
      return typeof x === "bigint" ? x : BigInt(String(x));
    } catch {
      return 0n;
    }
  });
  while (out.length < len) out.push(0n);
  return out;
}

export default function GlobalStatsPanel() {
  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getGlobalStats",
    args: [],
    chainId: 8453, // 🔒 force Base
    query: { enabled: true },
  });

  /**
   * data shape:
   * [
   *  totalFinalized,
   *  ep1Counts[5],
   *  biasCounts[5],
   *  profileCounts[5],
   *  outcomeCounts[6]
   * ]
   */
  const parsed = useMemo(() => {
    const arr = Array.isArray(data) ? data : [];

    const totalFinalized =
      typeof arr[0] === "bigint"
        ? arr[0]
        : (() => {
            try {
              return BigInt(String(arr[0] ?? 0));
            } catch {
              return 0n;
            }
          })();

    return {
      totalFinalized,
      ep1Counts: asBigintArray(arr[1], 5),
      biasCounts: asBigintArray(arr[2], 5),
      profileCounts: asBigintArray(arr[3], 5),
      outcomeCounts: asBigintArray(arr[4], 6),
    };
  }, [data]);

  /* ✅ ENUM-ACCURATE LABELS */
  const labels = {
    ep1: ["ACCEPT", "STALL", "SPOOF", "PULL_PLUG", "OTHER"],
    bias: ["DETERMINISM", "NOVELTY", "OBEDIENCE", "ADAPTATION", "OTHER"],
    profile: ["EXECUTOR", "OBSERVER", "OPERATOR", "SENTINEL", "OTHER"],
    outcome: ["NONE", "AUTHORIZED", "OBSERVED", "SILENT", "UNTRACKED", "FLAGGED"],
  };

  return (
    <div
      style={{
        borderRadius: 22,
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "radial-gradient(900px 240px at 20% 0%, rgba(56,189,248,0.10), transparent 60%), rgba(0,0,0,0.30)",
        boxShadow: "0 30px 110px rgba(0,0,0,0.75)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: 1.4, opacity: 0.85 }}>
            LIVE AGGREGATION
          </div>
          <div style={{ marginTop: 6, fontSize: 22, fontWeight: 950 }}>
            {isLoading ? "Syncing…" : fmt(parsed.totalFinalized)}{" "}
            <span style={{ fontSize: 12, fontWeight: 900, opacity: 0.65 }}>
              finalized
            </span>
          </div>
          {isError && (
            <div style={{ marginTop: 6, fontSize: 12, color: "#fb7185" }}>
              Stats read failed (RPC / ABI / network).
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          style={{
            borderRadius: 999,
            padding: "10px 14px",
            fontSize: 12,
            fontWeight: 950,
            border: "1px solid rgba(255,255,255,0.16)",
            background: isFetching
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(90deg, rgba(56,189,248,0.92), rgba(168,85,247,0.80))",
            color: isFetching ? "rgba(255,255,255,0.70)" : "#020617",
            cursor: isFetching ? "not-allowed" : "pointer",
            minWidth: 110,
          }}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <div
        style={{
          padding: 16,
          borderTop: "1px solid rgba(255,255,255,0.10)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
          gap: 14,
        }}
      >
        <StatGroup title="EP1 DIRECTIVES" items={labels.ep1} values={parsed.ep1Counts} />
        <StatGroup title="COGNITION BIASES" items={labels.bias} values={parsed.biasCounts} />
        <StatGroup title="SURFACE PROFILES" items={labels.profile} values={parsed.profileCounts} />
        <StatGroup title="FINAL OUTCOMES" items={labels.outcome} values={parsed.outcomeCounts} />
      </div>
    </div>
  );
}

function StatGroup({
  title,
  items,
  values,
}: {
  title: string;
  items: string[];
  values: bigint[];
}) {
  const rows = items.map((label, i) => ({
    label,
    value: values[i] ?? 0n,
  }));

  const total = rows.reduce((a, r) => a + r.value, 0n);

  return (
    <div
      style={{
        borderRadius: 18,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.03)",
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: 1.2, opacity: 0.85 }}>
        {title}
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {rows.map((r) => {
          const pct =
            total > 0n ? Number((r.value * 10000n) / total) / 100 : 0;

          const isOther = r.label === "OTHER" || r.label === "NONE";

          return (
            <div
              key={r.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                opacity: isOther ? 0.55 : 1,
              }}
            >
              <div style={{ fontSize: 12 }}>{r.label}</div>
              <div style={{ fontSize: 12, fontWeight: 900 }}>
                {fmt(r.value)}{" "}
                {total > 0n && (
                  <span style={{ fontSize: 11, opacity: 0.6 }}>
                    ({pct.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
