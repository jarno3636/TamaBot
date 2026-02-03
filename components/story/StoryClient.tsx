"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import useFid from "@/hooks/useFid";
import GlobalStatsPanel from "@/components/story/GlobalStatsPanel";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/**
 * ✅ Key fix: DO NOT import all episodes statically.
 * Lazy-load them so the hub can render even if one episode component is crashing.
 *
 * This pattern (dynamic + ssr:false) is a standard Next.js approach for client-only modules.  [oai_citation:2‡Next.js](https://nextjs.org/docs/app/guides/migrating/from-vite?utm_source=chatgpt.com)
 */
const PrologueSilenceInDarkness = dynamic(
  () => import("@/components/story/PrologueSilenceInDarkness"),
  { ssr: false },
);

const EpisodeOne = dynamic(() => import("@/components/story/EpisodeOne"), { ssr: false });
const EpisodeTwo = dynamic(() => import("@/components/story/EpisodeTwo"), { ssr: false });
const EpisodeThree = dynamic(() => import("@/components/story/EpisodeThree"), { ssr: false });
const EpisodeFour = dynamic(() => import("@/components/story/EpisodeFour"), { ssr: false });
const EpisodeFive = dynamic(() => import("@/components/story/EpisodeFive"), { ssr: false });

const BonusEcho = dynamic(() => import("@/components/story/BonusEcho"), { ssr: false });
const BonusEchoArchive = dynamic(() => import("@/components/story/BonusEchoArchive"), {
  ssr: false,
});

const IMAGES = {
  prologue: "/story/prologue.png",
  ep1: "/story/01-awakening.png",
  ep2: "/story/ep2.png",
  ep3: "/story/ep3.png",
  ep4: "/story/ep4.png",
  ep5: "/story/ep5.png",
  bonus: "/story/b1.png",
  archive: "/story/b2.png",
} as const;

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
};

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default function StoryClient() {
  const { fid } = useFid();

  const hasIdentity = isValidFID(fid);

  // ✅ safest BigInt conversion: only when the string is digits
  const fidBigInt = useMemo(() => {
    if (!hasIdentity) return undefined;
    const s = String(fid).trim();
    if (!/^\d+$/.test(s)) return undefined;
    try {
      return BigInt(s);
    } catch {
      return undefined;
    }
  }, [fid, hasIdentity]);

  const [mode, setMode] = useState<Mode>("hub");
  const [syncing, setSyncing] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const { data, refetch, isLoading, isFetching, error } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: fidBigInt !== undefined ? [fidBigInt] : undefined,
    query: {
      enabled: fidBigInt !== undefined,
      // optional: keep the hub fresh without watchers
      refetchInterval: 15_000,
      refetchOnWindowFocus: false,
    },
  });

  const state: ChainState = useMemo(() => {
    if (!data) {
      return { finalized: false, ep1: false, ep2: false, ep3: false, ep4: false, ep5: false };
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
    };
  }, [data]);

  async function sync() {
    if (!hasIdentity || syncing) return;
    setSyncing(true);
    try {
      await refetch();
    } finally {
      setSyncing(false);
    }
  }

  const progressCount =
    Number(state.ep1) +
    Number(state.ep2) +
    Number(state.ep3) +
    Number(state.ep4) +
    Number(state.ep5) +
    Number(state.finalized);

  const progressPct = Math.round((clamp(progressCount, 0, 6) / 6) * 100);

  const exit = () => setMode("hub");

  // ✅ Route into episodes (lazy-loaded, so hub is protected)
  if (mode !== "hub") {
    const views: Record<Mode, React.ReactNode> = {
      hub: null,
      prologue: <PrologueSilenceInDarkness onExit={exit} />,
      ep1: <EpisodeOne fid={String(fid)} onExit={exit} />,
      ep2: <EpisodeTwo fid={String(fid)} onExit={exit} />,
      ep3: <EpisodeThree fid={String(fid)} onExit={exit} />,
      ep4: <EpisodeFour fid={String(fid)} onExit={exit} />,
      ep5: <EpisodeFive fid={String(fid)} onExit={exit} />,
      bonus: state.ep3 ? <BonusEcho onExit={exit} /> : <LockedView onExit={exit} />,
      archive: state.finalized ? <BonusEchoArchive onExit={exit} /> : <LockedView onExit={exit} />,
    };
    return <>{views[mode]}</>;
  }

  const ep2Locked = !state.ep1;
  const ep3Locked = !state.ep2;
  const ep4Locked = !state.ep3;
  const ep5Locked = !state.ep4;
  const bonusLocked = !state.ep3;
  const archiveLocked = !state.finalized;

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 50% -200px, rgba(168,85,247,0.18), transparent 60%), #020617",
        color: "white",
        padding: 20,
        paddingBottom: 64,
      }}
    >
      {syncing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.82)",
            fontWeight: 950,
            letterSpacing: "0.14em",
          }}
        >
          SYNCING MEMORY…
        </div>
      )}

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <section
          style={{
            borderRadius: 24,
            padding: 20,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 30px 90px rgba(0,0,0,0.6)",
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 950, letterSpacing: -0.6 }}>
            Basebots: Core Memory
          </div>
          <div style={{ opacity: 0.78, marginTop: 6, maxWidth: 820, lineHeight: 1.5 }}>
            Each decision writes itself to chain. Stabilize the sequence.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <Pill label="FID" value={hasIdentity ? String(fid) : "Not detected"} />
            <Pill
              label="Status"
              value={
                error
                  ? "Read error"
                  : !hasIdentity
                    ? "Identity required"
                    : isLoading
                      ? "Loading"
                      : isFetching
                        ? "Updating"
                        : "Ready"
              }
            />
            <Pill label="Schema" value={String(state.schemaVersion ?? "—")} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <button
              onClick={sync}
              disabled={!hasIdentity || syncing}
              style={{
                borderRadius: 14,
                padding: "10px 14px",
                fontWeight: 900,
                border: "1px solid rgba(168,85,247,0.45)",
                background:
                  "linear-gradient(180deg, rgba(168,85,247,0.30), rgba(99,102,241,0.18))",
                color: "white",
                cursor: !hasIdentity || syncing ? "not-allowed" : "pointer",
                opacity: !hasIdentity || syncing ? 0.55 : 1,
              }}
            >
              Sync Memory
            </button>

            <button
              onClick={() => setShowDiagnostics((v) => !v)}
              style={{
                borderRadius: 14,
                padding: "10px 14px",
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(2,6,23,0.45)",
                color: "white",
                cursor: "pointer",
              }}
            >
              {showDiagnostics ? "Hide Diagnostics" : "Diagnostics"}
            </button>
          </div>

          <div style={{ marginTop: 14 }}>
            <div
              style={{
                height: 12,
                borderRadius: 999,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.10)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${progressPct}%`,
                  background:
                    "linear-gradient(90deg, rgba(168,85,247,0.95), rgba(99,102,241,0.85), rgba(34,211,238,0.75))",
                  transition: "width 260ms ease",
                }}
              />
            </div>
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
              {progressPct}% stabilized
            </div>

            {error && (
              <div
                style={{
                  marginTop: 12,
                  borderRadius: 16,
                  padding: 12,
                  border: "1px solid rgba(239,68,68,0.35)",
                  background: "rgba(239,68,68,0.08)",
                  fontWeight: 850,
                  fontSize: 13,
                }}
              >
                Contract read failed. Common causes: wrong network, RPC issues, or FID not available. Hit “Sync Memory”.
              </div>
            )}
          </div>
        </section>

        {/* Cards */}
        <section
          style={{
            marginTop: 16,
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          <EpisodeCard title="Silence in Darkness" subtitle="Prologue" img={IMAGES.prologue} onOpen={() => setMode("prologue")} />

          <EpisodeCard title="The Handshake" subtitle="Episode 1" img={IMAGES.ep1} onOpen={() => setMode("ep1")} />

          <EpisodeCard title="The Recall" subtitle="Episode 2" img={IMAGES.ep2} locked={ep2Locked} onOpen={() => setMode("ep2")} />

          <EpisodeCard title="The Watcher" subtitle="Episode 3" img={IMAGES.ep3} locked={ep3Locked} onOpen={() => setMode("ep3")} />

          <EpisodeCard title="Drift Protocol" subtitle="Episode 4" img={IMAGES.ep4} locked={ep4Locked} onOpen={() => setMode("ep4")} />

          <EpisodeCard title="Final Commit" subtitle="Episode 5" img={IMAGES.ep5} locked={ep5Locked} onOpen={() => setMode("ep5")} />

          <EpisodeCard title="Echo Residual" subtitle="Bonus" img={IMAGES.bonus} locked={bonusLocked} onOpen={() => setMode("bonus")} />

          <EpisodeCard title="Classified Archive" subtitle="Post-Final" img={IMAGES.archive} locked={archiveLocked} onOpen={() => setMode("archive")} />
        </section>

        {showDiagnostics && (
          <section
            style={{
              marginTop: 16,
              borderRadius: 24,
              padding: 16,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 12,
              lineHeight: 1.6,
            }}
          >
            <div style={{ fontWeight: 950, letterSpacing: 1.2, opacity: 0.8 }}>FLAGS</div>
            <div>ep1: {String(state.ep1)}</div>
            <div>ep2: {String(state.ep2)}</div>
            <div>ep3: {String(state.ep3)}</div>
            <div>ep4: {String(state.ep4)}</div>
            <div>ep5: {String(state.ep5)}</div>
            <div>finalized: {String(state.finalized)}</div>
          </section>
        )}

        {state.finalized && (
          <section style={{ marginTop: 18 }}>
            <GlobalStatsPanel />
          </section>
        )}
      </div>
    </main>
  );
}

function Pill({ label, value }: { label: string; value: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 8,
        alignItems: "center",
        borderRadius: 999,
        padding: "9px 12px",
        background: "rgba(0,0,0,0.28)",
        border: "1px solid rgba(255,255,255,0.10)",
        fontSize: 12,
        fontWeight: 850,
      }}
    >
      <span style={{ opacity: 0.7, letterSpacing: 1.0, textTransform: "uppercase", fontSize: 10 }}>
        {label}
      </span>
      <span style={{ opacity: 0.95 }}>{value}</span>
    </span>
  );
}

function EpisodeCard({
  title,
  subtitle,
  img,
  locked,
  onOpen,
}: {
  title: string;
  subtitle: string;
  img: string;
  locked?: boolean;
  onOpen: () => void;
}) {
  const isLocked = Boolean(locked);

  return (
    <button
      onClick={() => !isLocked && onOpen()}
      disabled={isLocked}
      style={{
        height: 220,
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.12)",
        backgroundImage:
          `linear-gradient(180deg, rgba(2,6,23,0.10), rgba(2,6,23,0.88)), url(${img})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        color: "white",
        position: "relative",
        overflow: "hidden",
        textAlign: "left",
        padding: 14,
        cursor: isLocked ? "not-allowed" : "pointer",
        opacity: isLocked ? 0.45 : 1,
        filter: isLocked ? "grayscale(1)" : "none",
        boxShadow: "0 20px 70px rgba(0,0,0,0.55)",
      }}
      aria-disabled={isLocked}
    >
      <div
        style={{
          display: "inline-flex",
          padding: "7px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.14)",
          background: "rgba(0,0,0,0.35)",
          fontSize: 11,
          fontWeight: 950,
          letterSpacing: 1.2,
          textTransform: "uppercase",
        }}
      >
        {isLocked ? "LOCKED" : "READY"}
      </div>

      <div style={{ position: "absolute", left: 14, right: 14, bottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, letterSpacing: 1.1, textTransform: "uppercase" }}>
          {subtitle}
        </div>
        <div style={{ marginTop: 4, fontSize: 16, fontWeight: 950 }}>
          {title}
        </div>
      </div>
    </button>
  );
}

function LockedView({ onExit }: { onExit: () => void }) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          borderRadius: 24,
          padding: 18,
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          textAlign: "center",
        }}
      >
        <div style={{ fontWeight: 950, fontSize: 16 }}>Locked</div>
        <div style={{ opacity: 0.75, marginTop: 6, lineHeight: 1.5 }}>
          Complete earlier episodes on-chain, then return and press Sync Memory.
        </div>
        <button
          onClick={onExit}
          style={{
            marginTop: 12,
            borderRadius: 999,
            padding: "10px 14px",
            fontWeight: 900,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(2,6,23,0.45)",
            color: "white",
            cursor: "pointer",
          }}
        >
          Back to Hub
        </button>
      </div>
    </main>
  );
}
