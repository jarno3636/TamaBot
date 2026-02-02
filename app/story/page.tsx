"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import useFid from "@/hooks/useFid";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";
import BonusEchoArchive from "@/components/story/BonusEchoArchive";
import GlobalStatsPanel from "@/components/story/GlobalStatsPanel";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function fmtTs(ts?: number) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

/* ────────────────────────────────────────────── */

type Mode =
  | "hub"
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5"
  | "bonus"
  | "archive";

type ChainState = {
  finalized: boolean;
  ep1: boolean;
  ep2: boolean;
  ep3: boolean;
  ep4: boolean;
  ep5: boolean;
  schemaVersion?: number;
  updatedAt?: number;
  finalizedAt?: number;
};

/* ────────────────────────────────────────────── */

export default function StoryPage() {
  const publicClient = usePublicClient();
  const { fid } = useFid();

  /* ✅ SAME PATTERN AS REST OF APP */
  const hasIdentity = isValidFID(fid);
  const fidNum = hasIdentity ? Number(fid) : null;
  const fidBigInt = hasIdentity ? BigInt(fidNum!) : undefined;

  const [mode, setMode] = useState<Mode>("hub");
  const [syncing, setSyncing] = useState(false);

  /* ───────── On-chain state ───────── */

  const { data, refetch } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: fidBigInt !== undefined ? [fidBigInt] : undefined,
    query: { enabled: fidBigInt !== undefined },
  });

  const state: ChainState = useMemo(() => {
    if (!data) {
      return {
        finalized: false,
        ep1: false,
        ep2: false,
        ep3: false,
        ep4: false,
        ep5: false,
      };
    }

    const s: any = data;
    return {
      finalized: Boolean(s.finalized),
      ep1: Boolean(s.ep1Set),
      ep2: Boolean(s.ep2Set),
      ep3: Boolean(s.ep3Set),
      ep4: Boolean(s.ep4Set),
      ep5: Boolean(s.ep5Set),
      schemaVersion: Number(s.schemaVersion),
      updatedAt: Number(s.updatedAt),
      finalizedAt: Number(s.finalizedAt),
    };
  }, [data]);
  /* ───────── Progress ───────── */

  const progressCount =
    Number(state.ep1) +
    Number(state.ep2) +
    Number(state.ep3) +
    Number(state.ep4) +
    Number(state.ep5) +
    Number(state.finalized);

  const progressPct = Math.round(
    (clamp(progressCount, 0, 6) / 6) * 100
  );
  /* ───────── Sync ───────── */

  async function cinematicSync() {
    if (!hasIdentity || syncing) return;
    setSyncing(true);
    try {
      await refetch();
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    if (hasIdentity) cinematicSync();
  }, [hasIdentity]);

  /* ───────── Contract Events ───────── */

  useEffect(() => {
    if (!publicClient || !fidBigInt) return;

    const handler = () => void cinematicSync();

    const unwatch1 = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: handler,
    });

    const unwatch2 = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "Finalized",
      onLogs: handler,
    });

    return () => {
      unwatch1();
      unwatch2();
    };
  }, [publicClient, fidBigInt]);

  /* ───────── Routing ───────── */

  const exit = () => setMode("hub");

  if (mode !== "hub") {
    const map: Record<Mode, JSX.Element | null> = {
      hub: null,
      prologue: <PrologueSilenceInDarkness onExit={exit} />,
      ep1: <EpisodeOne fid={fid!} onExit={exit} />,
      ep2: <EpisodeTwo fid={fid!} onExit={exit} />,
      ep3: <EpisodeThree fid={fid!} onExit={exit} />,
      ep4: <EpisodeFour fid={fid!} onExit={exit} />,
      ep5: <EpisodeFive fid={fid!} onExit={exit} />,
      bonus: state.ep3 ? <BonusEcho onExit={exit} /> : null,
      archive: state.finalized ? <BonusEchoArchive onExit={exit} /> : null,
    };

    return map[mode];
  }

  /* ───────── Premium Inline UI ───────── */

  const shell: React.CSSProperties = {
    minHeight: "100vh",
    color: "white",
    padding: 22,
    background:
      "radial-gradient(1200px 700px at 20% -10%, rgba(168,85,247,0.25), transparent 65%)," +
      "radial-gradient(900px 650px at 90% 10%, rgba(99,102,241,0.18), transparent 60%)," +
      "radial-gradient(800px 600px at 50% 110%, rgba(34,211,238,0.10), transparent 55%)," +
      "#020617",
  };

  const container: React.CSSProperties = {
    maxWidth: 1140,
    margin: "0 auto",
  };

  const glass: React.CSSProperties = {
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,0.10)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
    boxShadow:
      "0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(168,85,247,0.10) inset",
    position: "relative",
    overflow: "hidden",
  };

  const heroCard: React.CSSProperties = {
    ...glass,
    padding: 20,
    marginBottom: 18,
  };

  const heroTopRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  };

  const titleWrap: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    minWidth: 260,
  };

  const h1: React.CSSProperties = {
    fontSize: 38,
    letterSpacing: "-0.02em",
    lineHeight: 1.05,
    margin: 0,
    fontWeight: 900,
    textShadow: "0 0 22px rgba(168,85,247,0.35)",
  };

  const sub: React.CSSProperties = {
    margin: 0,
    opacity: 0.86,
    maxWidth: 760,
    lineHeight: 1.5,
    fontSize: 14,
  };

  const pillRow: React.CSSProperties = {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-end",
  };

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "10px 12px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(2,6,23,0.55)",
    boxShadow: "0 10px 35px rgba(0,0,0,0.35)",
    fontWeight: 800,
    fontSize: 12,
  };

  const buttonPrimary: React.CSSProperties = {
    cursor: "pointer",
    borderRadius: 14,
    padding: "10px 14px",
    border: "1px solid rgba(168,85,247,0.45)",
    background:
      "linear-gradient(180deg, rgba(168,85,247,0.30), rgba(99,102,241,0.18))",
    boxShadow:
      "0 14px 40px rgba(168,85,247,0.18), 0 0 0 1px rgba(168,85,247,0.12) inset",
    color: "white",
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: "0.01em",
  };

  const buttonGhost: React.CSSProperties = {
    cursor: "pointer",
    borderRadius: 14,
    padding: "10px 14px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(2,6,23,0.45)",
    boxShadow: "0 12px 35px rgba(0,0,0,0.35)",
    color: "white",
    fontWeight: 900,
    fontSize: 13,
  };

  const disabledButton: React.CSSProperties = {
    cursor: "not-allowed",
    opacity: 0.55,
    filter: "grayscale(0.2)",
  };

  const progressWrap: React.CSSProperties = {
    marginTop: 14,
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  };

  const progressBarOuter: React.CSSProperties = {
    flex: "1 1 320px",
    height: 12,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(2,6,23,0.55)",
    overflow: "hidden",
    boxShadow: "0 12px 30px rgba(0,0,0,0.35) inset",
    position: "relative",
  };

  const progressBarInner: React.CSSProperties = {
    width: `${progressPct}%`,
    height: "100%",
    borderRadius: 999,
    background:
      "linear-gradient(90deg, rgba(168,85,247,0.95), rgba(99,102,241,0.85), rgba(34,211,238,0.75))",
    boxShadow: "0 0 24px rgba(168,85,247,0.55)",
    transition: "width 420ms ease",
  };

  const progressLabel: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.9,
    letterSpacing: "0.02em",
  };

  const grid: React.CSSProperties = {
    ...container,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
    gap: 16,
    marginTop: 16,
  };

  const overlay: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background:
      "radial-gradient(800px 500px at 50% 30%, rgba(168,85,247,0.20), transparent 60%), rgba(2,6,23,0.88)",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
    fontWeight: 900,
    zIndex: 999,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
  };

  const diagCard: React.CSSProperties = {
    ...glass,
    padding: 16,
    marginTop: 16,
  };

  const diagRow: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
  };

  const diagItem: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(2,6,23,0.40)",
    padding: 12,
  };

  const diagK: React.CSSProperties = {
    fontSize: 11,
    opacity: 0.75,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
  };

  const diagV: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 900,
    margin: 0,
  };

  // Correct unlocking + “done” logic from your ABI:
  const ep1Done = state.ep1;
  const ep2Done = state.ep2;
  const ep3Done = state.ep3;
  const ep4Done = state.ep4;
  const ep5Done = state.ep5; // <-- this exists in your ABI
  const finalizedDone = state.finalized;

  const ep2Locked = !ep1Done;
  const ep3Locked = !ep2Done;
  const ep4Locked = !ep3Done;
  const ep5Locked = !ep4Done;
  const bonusLocked = !ep3Done;
  const archiveLocked = !finalizedDone;

  return (
    <main style={shell}>
      {/* Keyframes only (everything else inline) */}
      <style>{`
        @keyframes bbPulse {
          0%,100% { transform: scale(1); opacity: .95; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        @keyframes bbGlow {
          0% { filter: drop-shadow(0 0 0 rgba(168,85,247,0)); }
          100% { filter: drop-shadow(0 0 18px rgba(168,85,247,0.35)); }
        }
        @keyframes bbScan {
          0% { transform: translateY(-120%); opacity: 0.0; }
          10% { opacity: 0.25; }
          100% { transform: translateY(180%); opacity: 0.0; }
        }
      `}</style>

      {syncing && <div style={overlay}>SYNCING MEMORY…</div>}

      <div style={container}>
        <header style={heroCard}>
          {/* Ambient accents */}
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: -2,
              background:
                "radial-gradient(900px 400px at 10% 10%, rgba(168,85,247,0.22), transparent 60%)," +
                "radial-gradient(700px 350px at 90% 0%, rgba(99,102,241,0.18), transparent 58%)",
              pointerEvents: "none",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "8%",
              right: "8%",
              top: -60,
              height: 60,
              background:
                "linear-gradient(180deg, rgba(168,85,247,0.0), rgba(168,85,247,0.25), rgba(168,85,247,0.0))",
              transform: "skewY(-6deg)",
              animation: "bbScan 4.6s linear infinite",
              pointerEvents: "none",
              opacity: 0.18,
            }}
          />

          <div style={heroTopRow}>
            <div style={titleWrap}>
              <h1 style={h1}>Basebots: Core Memory</h1>
              <p style={sub}>
                Memory fragments surface as systems awaken. Each onchain decision stabilizes the sequence and unlocks the next layer.
              </p>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
                <span style={pill}>
                  <span style={{ opacity: 0.8 }}>FID</span>
                  <span style={{ fontSize: 12 }}>
                    {hasIdentity ? String(fid) : "Not detected"}
                  </span>
                </span>

                <span style={pill}>
                  <span style={{ opacity: 0.8 }}>Status</span>
                  <span style={{ fontSize: 12 }}>
                    {error
                      ? "Read error"
                      : !hasIdentity
                      ? "Identity required"
                      : isLoading
                      ? "Loading"
                      : isFetching
                      ? "Updating"
                      : "Ready"}
                  </span>
                </span>

                <span style={pill}>
                  <span style={{ opacity: 0.8 }}>Schema</span>
                  <span style={{ fontSize: 12 }}>
                    {state.schemaVersion ?? "—"}
                  </span>
                </span>
              </div>
            </div>

            <div style={pillRow}>
              <button
                onClick={cinematicSync}
                disabled={!hasIdentity || syncing}
                style={{
                  ...buttonPrimary,
                  ...((!hasIdentity || syncing) ? disabledButton : {}),
                }}
              >
                Sync Memory
              </button>

              <button
                onClick={() => setSoundOn((s) => !s)}
                style={buttonGhost}
              >
                {soundOn ? "Sound ON" : "Sound OFF"}
              </button>

              <button
                onClick={() => setShowDiagnostics((v) => !v)}
                style={buttonGhost}
              >
                {showDiagnostics ? "Hide Diagnostics" : "Diagnostics"}
              </button>
            </div>
          </div>

          <div style={progressWrap}>
            <div style={progressBarOuter} aria-label="progress">
              <div style={progressBarInner} />
            </div>
            <div style={progressLabel}>{progressPct}% stabilized</div>
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(239,68,68,0.35)",
                background: "rgba(239,68,68,0.08)",
                padding: 12,
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              Contract read failed. This is usually **wrong chain**, **wrong RPC**, or **FID missing**. If you toggled networks, hit Sync Memory.
            </div>
          )}
        </header>

        <section style={grid}>
          <EpisodeCardPremium
            title="Silence in Darkness"
            subtitle="Prologue"
            img={IMAGES.prologue}
            status="READY"
            accent="purple"
            onOpen={() => setMode("prologue")}
          />

          <EpisodeCardPremium
            title="The Handshake"
            subtitle="Episode 1"
            img={IMAGES.ep1}
            status={ep1Done ? "COMPLETE" : "READY"}
            accent={ep1Done ? "cyan" : "purple"}
            onOpen={() => setMode("ep1")}
          />

          <EpisodeCardPremium
            title="The Recall"
            subtitle="Episode 2"
            img={IMAGES.ep2}
            locked={ep2Locked}
            status={ep2Locked ? "LOCKED" : ep2Done ? "COMPLETE" : "READY"}
            accent={ep2Done ? "cyan" : "purple"}
            onOpen={() => setMode("ep2")}
          />

          <EpisodeCardPremium
            title="The Watcher"
            subtitle="Episode 3"
            img={IMAGES.ep3}
            locked={ep3Locked}
            status={ep3Locked ? "LOCKED" : ep3Done ? "COMPLETE" : "READY"}
            accent={ep3Done ? "cyan" : "purple"}
            onOpen={() => setMode("ep3")}
          />

          <EpisodeCardPremium
            title="Drift Protocol"
            subtitle="Episode 4"
            img={IMAGES.ep4}
            locked={ep4Locked}
            status={ep4Locked ? "LOCKED" : ep4Done ? "COMPLETE" : "READY"}
            accent={ep4Done ? "cyan" : "purple"}
            onOpen={() => setMode("ep4")}
          />

          <EpisodeCardPremium
            title="Final Commit"
            subtitle="Episode 5"
            img={IMAGES.ep5}
            locked={ep5Locked}
            status={ep5Locked ? "LOCKED" : ep5Done ? "COMPLETE" : "READY"}
            accent={ep5Done ? "cyan" : "purple"}
            onOpen={() => setMode("ep5")}
          />

          <EpisodeCardPremium
            title="Echo Residual"
            subtitle="Bonus"
            img={IMAGES.bonus}
            locked={bonusLocked}
            status={bonusLocked ? "LOCKED" : "READY"}
            accent="magenta"
            badge="BONUS"
            onOpen={() => setMode("bonus")}
          />

          <EpisodeCardPremium
            title="Classified Archive"
            subtitle="Post-Final"
            img={IMAGES.archive}
            locked={archiveLocked}
            status={archiveLocked ? "LOCKED" : "READY"}
            accent="amber"
            badge="ARCHIVE"
            onOpen={() => setMode("archive")}
          />
        </section>

        {showDiagnostics && (
          <section style={diagCard}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 950, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Onchain Diagnostics
                </div>
                <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
                  If you completed onchain steps but cards still lock, the mismatch is almost always **FID**, **network**, or **state decoding**.
                </div>
              </div>

              <button
                onClick={cinematicSync}
                disabled={!hasIdentity || syncing}
                style={{
                  ...buttonPrimary,
                  ...((!hasIdentity || syncing) ? disabledButton : {}),
                  animation: "bbGlow 900ms ease-in-out infinite alternate",
                }}
              >
                Force Refetch
              </button>
            </div>

            <div style={{ height: 12 }} />

            <div style={diagRow}>
              <div style={diagItem}>
                <div style={diagK}>FID</div>
                <p style={diagV}>{hasIdentity ? String(fid) : "Not detected"}</p>
              </div>

              <div style={diagItem}>
                <div style={diagK}>Contract</div>
                <p style={diagV}>{BASEBOTS_S2.address}</p>
              </div>

              <div style={diagItem}>
                <div style={diagK}>Flags</div>
                <p style={diagV}>
                  ep1:{String(state.ep1)} · ep2:{String(state.ep2)} · ep3:{String(state.ep3)} · ep4:{String(state.ep4)} · ep5:{String(state.ep5)} · finalized:{String(state.finalized)}
                </p>
              </div>

              <div style={diagItem}>
                <div style={diagK}>Timestamps</div>
                <p style={diagV}>
                  updatedAt: {fmtTs(state.updatedAt)} <br />
                  finalizedAt: {fmtTs(state.finalizedAt)}
                </p>
              </div>

              <div style={diagItem}>
                <div style={diagK}>Choices</div>
                <p style={diagV}>
                  ep1Choice: {state.ep1Choice ?? "—"} · bias: {state.cognitionBias ?? "—"} · profile: {state.profile ?? "—"} · outcome: {state.outcome ?? "—"}
                </p>
              </div>

              <div style={diagItem}>
                <div style={diagK}>Designation</div>
                <p style={diagV}>{state.designation ?? "—"}</p>
              </div>
            </div>
          </section>
        )}

        {finalizedDone && (
          <section style={{ marginTop: 22 }}>
            <div
              style={{
                ...glass,
                padding: 16,
                marginBottom: 16,
                border: "1px solid rgba(34,211,238,0.18)",
                boxShadow:
                  "0 30px 90px rgba(0,0,0,0.55), 0 0 40px rgba(34,211,238,0.18)",
              }}
            >
              <div style={{ fontWeight: 950, fontSize: 14, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Global Signal
              </div>
              <div style={{ opacity: 0.82, fontSize: 12, marginTop: 4 }}>
                You’ve finalized the sequence. Global stats are now accessible.
              </div>
            </div>
            <GlobalStatsPanel />
          </section>
        )}
      </div>
    </main>
  );
}

/* ────────────────────────────────────────────── */
/* Premium Episode Card (inline styles) */

function EpisodeCardPremium({
  title,
  subtitle,
  img,
  locked,
  status,
  badge,
  accent,
  onOpen,
}: {
  title: string;
  subtitle: string;
  img: string;
  locked?: boolean;
  status: "LOCKED" | "READY" | "COMPLETE";
  badge?: string;
  accent: "purple" | "cyan" | "magenta" | "amber";
  onOpen: () => void;
}) {
  const accentMap = {
    purple: {
      ring: "rgba(168,85,247,0.50)",
      glow: "rgba(168,85,247,0.40)",
      chip: "rgba(168,85,247,0.16)",
    },
    cyan: {
      ring: "rgba(34,211,238,0.45)",
      glow: "rgba(34,211,238,0.30)",
      chip: "rgba(34,211,238,0.14)",
    },
    magenta: {
      ring: "rgba(236,72,153,0.45)",
      glow: "rgba(236,72,153,0.28)",
      chip: "rgba(236,72,153,0.14)",
    },
    amber: {
      ring: "rgba(245,158,11,0.45)",
      glow: "rgba(245,158,11,0.26)",
      chip: "rgba(245,158,11,0.14)",
    },
  }[accent];

  const isLocked = Boolean(locked);
  const isComplete = status === "COMPLETE";

  const card: React.CSSProperties = {
    height: 236,
    borderRadius: 26,
    border: `1px solid ${isComplete ? accentMap.ring : "rgba(255,255,255,0.12)"}`,
    backgroundImage:
      `linear-gradient(180deg, rgba(2,6,23,0.10), rgba(2,6,23,0.88)), url(${img})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    position: "relative",
    overflow: "hidden",
    textAlign: "left",
    padding: 16,
    cursor: isLocked ? "not-allowed" : "pointer",
    opacity: isLocked ? 0.45 : 1,
    filter: isLocked ? "grayscale(1) blur(0.35px)" : "none",
    boxShadow: isLocked
      ? "0 18px 65px rgba(0,0,0,0.45)"
      : `0 22px 80px rgba(0,0,0,0.55), 0 0 42px ${accentMap.glow}`,
    transition: "transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease, opacity 180ms ease",
  };

  const hoverLift: React.CSSProperties = isLocked
    ? {}
    : {
        transform: "translateY(-3px)",
      };

  const topRow: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "flex-start",
  };

  const chip: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(2,6,23,0.50)",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  const chipAccent: React.CSSProperties = {
    ...chip,
    border: `1px solid ${accentMap.ring}`,
    background: accentMap.chip,
    boxShadow: `0 0 18px ${accentMap.glow}`,
  };

  const statusChip: React.CSSProperties =
    status === "LOCKED"
      ? chip
      : status === "READY"
      ? {
          ...chipAccent,
          animation: "bbPulse 1.8s ease-in-out infinite",
        }
      : {
          ...chipAccent,
        };

  const titleStyle: React.CSSProperties = {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const titleText: React.CSSProperties = {
    fontWeight: 950,
    fontSize: 16,
    margin: 0,
    textShadow: "0 12px 32px rgba(0,0,0,0.75)",
  };

  const subText: React.CSSProperties = {
    margin: 0,
    fontSize: 12,
    opacity: 0.82,
    fontWeight: 800,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
  };

  const sheen: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    background:
      "radial-gradient(800px 220px at 20% 15%, rgba(255,255,255,0.10), transparent 55%)," +
      "radial-gradient(500px 240px at 85% 25%, rgba(168,85,247,0.14), transparent 60%)",
    mixBlendMode: "screen",
    opacity: isLocked ? 0.35 : 0.70,
  };

  return (
    <button
      onClick={() => !isLocked && onOpen()}
      style={card}
      onMouseEnter={(e) => {
        if (isLocked) return;
        Object.assign((e.currentTarget as HTMLButtonElement).style, hoverLift as any);
      }}
      onMouseLeave={(e) => {
        Object.assign((e.currentTarget as HTMLButtonElement).style, { transform: "translateY(0px)" } as any);
      }}
      aria-disabled={isLocked}
    >
      <div aria-hidden style={sheen} />

      <div style={topRow}>
        <div style={statusChip}>{status}</div>
        {badge ? <div style={chipAccent}>{badge}</div> : null}
      </div>

      <div style={titleStyle}>
        <p style={subText}>{subtitle}</p>
        <p style={titleText}>{title}</p>
      </div>
    </button>
  );
}
