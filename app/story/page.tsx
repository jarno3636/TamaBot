"use client";

import React, { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";

import useFid from "@/hooks/useFid";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";

import { BASEBOTS } from "@/lib/abi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ───────────────────────────────────────────── */

const BASE_CHAIN_ID = 8453;

/* ───────────────────────────────────────────── */

function nextCoreMode(flags?: {
  ep1?: boolean;
  ep2?: boolean;
  ep3?: boolean;
  ep4?: boolean;
  ep5?: boolean;
}) {
  if (!flags?.ep1) return "ep1";
  if (!flags?.ep2) return "ep2";
  if (!flags?.ep3) return "ep3";
  if (!flags?.ep4) return "ep4";
  return "ep5";
}

/* ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<
    "hub" | "prologue" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "bonus"
  >("hub");

  const { address, chain } = useAccount();
  const fid = useFid();

  /* SAFE bigint normalization */
  const tokenId = useMemo<bigint | undefined>(() => {
    try {
      if (typeof fid === "bigint") return fid;
      if (typeof fid === "number") return BigInt(fid);
      if (typeof fid === "string" && /^\d+$/.test(fid)) return BigInt(fid);
      return undefined;
    } catch {
      return undefined;
    }
  }, [fid]);

  const hasToken = Boolean(tokenId);
  const wrongChain = Boolean(chain?.id) && chain?.id !== BASE_CHAIN_ID;

  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: hasToken ? [tokenId!] : undefined,
    query: { enabled: hasToken },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  const { data: progressFlags } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getProgressFlags",
    args: hasToken ? [tokenId!] : undefined,
    query: { enabled: hasToken && hasBasebot },
  });

  const progress = progressFlags as
    | {
        ep1: boolean;
        ep2: boolean;
        ep3: boolean;
        ep4: boolean;
        ep5: boolean;
        finalized: boolean;
      }
    | undefined;

  const canPlayCore = Boolean(address) && hasBasebot && !wrongChain;
  const currentCore = useMemo(() => nextCoreMode(progress), [progress]);

  /* ───────────────── ROUTING (TYPE-SAFE) ───────────────── */

  if (mode !== "hub") {
    if (!tokenId && mode !== "prologue" && mode !== "bonus") {
      return (
        <div style={{ padding: 40, color: "white" }}>
          Unable to load episode. Token not detected.
        </div>
      );
    }

    const map: Record<string, React.ReactNode> = {
      ep1: <EpisodeOne tokenId={tokenId!} onExit={() => setMode("hub")} />,
      ep2: <EpisodeTwo tokenId={tokenId!} onExit={() => setMode("hub")} />,
      ep3: <EpisodeThree tokenId={tokenId!} onExit={() => setMode("hub")} />,
      ep4: <EpisodeFour tokenId={tokenId!} onExit={() => setMode("hub")} />,
      ep5: <EpisodeFive tokenId={tokenId!} onExit={() => setMode("hub")} />,
      prologue: <PrologueSilenceInDarkness onExit={() => setMode("hub")} />,
      bonus: <BonusEcho onExit={() => setMode("hub")} />,
    };

    return <>{map[mode]}</>;
  }

  /* ───────────────── HUB DATA ───────────────── */

  const coreEpisodes = [
    {
      id: "ep1",
      title: "Awakening Protocol",
      unlocked: true,
      note: "Initialization begins. Your first directive is recorded.",
      current: currentCore === "ep1",
      onClick: () => setMode("ep1"),
    },
    {
      id: "ep2",
      title: "Signal Fracture",
      unlocked: canPlayCore && Boolean(progress?.ep1),
      note: "Designation binding. A name becomes a constraint.",
      current: currentCore === "ep2",
      onClick: () => setMode("ep2"),
    },
    {
      id: "ep3",
      title: "Fault Lines",
      unlocked: canPlayCore && Boolean(progress?.ep2),
      note: "Contradictions form. You decide how the system thinks.",
      current: currentCore === "ep3",
      onClick: () => setMode("ep3"),
    },
    {
      id: "ep4",
      title: "Threshold",
      unlocked: canPlayCore && Boolean(progress?.ep3),
      note: "A profile is derived. The city prepares its response.",
      current: currentCore === "ep4",
      onClick: () => setMode("ep4"),
    },
    {
      id: "ep5",
      title: "Emergence",
      unlocked: canPlayCore && Boolean(progress?.ep4),
      note: "Surface access is negotiated. Outcomes are permanent.",
      current: currentCore === "ep5",
      onClick: () => setMode("ep5"),
    },
  ];

  /* ───────────────── RENDER ───────────────── */

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(56,189,248,0.14), transparent 60%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.18), transparent 60%), #020617",
        color: "white",
        padding: "56px 16px 96px",
      }}
    >
      {/* HERO */}
      <section
        style={{
          maxWidth: 1100,
          margin: "0 auto 56px",
          padding: "36px 32px",
          borderRadius: 32,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.55))",
          boxShadow: "0 50px 180px rgba(0,0,0,0.85)",
          position: "relative",
        }}
      >
        <h1 style={{ fontSize: 34, fontWeight: 900, letterSpacing: 1.4 }}>
          BaseBots: Core Memory
        </h1>

        <p
          style={{
            marginTop: 12,
            maxWidth: 760,
            fontSize: 14,
            lineHeight: 1.6,
            color: "rgba(255,255,255,0.78)",
          }}
        >
          Every BaseBot remembers.
          <br />
          <span style={{ color: "rgba(255,255,255,0.95)" }}>
            The system is not asking who you are — it is archiving what you permit it to conclude.
          </span>
        </p>
      </section>

      {/* CORE SEQUENCE */}
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 28,
          }}
        >
          {coreEpisodes.map((ep) => (
            <button
              key={ep.id}
              onClick={ep.onClick}
              disabled={!ep.unlocked}
              style={{
                textAlign: "left",
                padding: 28,
                borderRadius: 28,
                border: ep.current
                  ? "1px solid rgba(250,204,21,0.85)"
                  : "1px solid rgba(255,255,255,0.12)",
                background: ep.unlocked
                  ? "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(0,0,0,0.55))"
                  : "rgba(255,255,255,0.04)",
                boxShadow: ep.current
                  ? "0 0 0 1px rgba(250,204,21,0.35), 0 36px 140px rgba(0,0,0,0.9)"
                  : "0 32px 120px rgba(0,0,0,0.85)",
                cursor: ep.unlocked ? "pointer" : "not-allowed",
                transition: "transform 160ms ease, box-shadow 160ms ease",
              }}
            >
              <h2 style={{ fontSize: 18, fontWeight: 900 }}>{ep.title}</h2>
              <p style={{ marginTop: 10, fontSize: 13, opacity: 0.72 }}>
                {ep.note}
              </p>

              {ep.current && (
                <div
                  style={{
                    marginTop: 16,
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 1.2,
                    color: "rgba(250,204,21,0.95)",
                  }}
                >
                  ▶ ACTIVE MEMORY PATH
                </div>
              )}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
