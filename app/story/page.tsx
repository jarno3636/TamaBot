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
const BONUS1_BIT = 1;
const BONUS2_BIT = 2;

type Mode =
  | "hub"
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5"
  | "bonus";

/* ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");

  const { address, chain } = useAccount();
  const { fid } = useFid();

  /* ───────── token handling (critical) ───────── */

  // STRING for components
  const tokenIdString = useMemo(() => {
    return typeof fid === "number" && fid > 0 ? String(fid) : undefined;
  }, [fid]);

  // BigInt ONLY for wagmi
  const tokenIdBigInt = useMemo(() => {
    try {
      return tokenIdString ? BigInt(tokenIdString) : undefined;
    } catch {
      return undefined;
    }
  }, [tokenIdString]);

  const wrongChain = Boolean(chain?.id) && chain?.id !== BASE_CHAIN_ID;

  /* ───────── ownership check ───────── */

  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    query: { enabled: Boolean(tokenIdBigInt) },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  /* ───────── progress flags ───────── */

  const { data: progressFlags } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getBotState",
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    query: { enabled: Boolean(tokenIdBigInt) && hasBasebot },
  });

  const progress = useMemo(() => {
    if (!progressFlags) return undefined;
    const p = progressFlags as any;
    return {
      ep1: Boolean(p.ep1Set),
      ep2: Boolean(p.ep2Set),
      ep3: Boolean(p.ep3Set),
      ep4: Boolean(p.ep4Set),
      ep5: Boolean(p.ep5Set),
    };
  }, [progressFlags]);

  /* ───────── bonus bits ───────── */

  const { data: hasB1 } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "hasBonusBit",
    args: tokenIdBigInt ? [tokenIdBigInt, BONUS1_BIT] : undefined,
    query: { enabled: Boolean(tokenIdBigInt) && hasBasebot },
  });

  const { data: hasB2 } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "hasBonusBit",
    args: tokenIdBigInt ? [tokenIdBigInt, BONUS2_BIT] : undefined,
    query: { enabled: Boolean(tokenIdBigInt) && hasBasebot },
  });

  const bonusUnlocked = Boolean(hasB1 || hasB2);

  /* ───────── global stats ───────── */

  const { data: globalStats } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getGlobalStats",
    query: { enabled: !wrongChain },
  });

  const totalFinalized = globalStats
    ? Number((globalStats as any)[0])
    : 0;

  /* ───────── gating rules ───────── */

  const canReadPublic = !wrongChain;
  const canPlayGated = Boolean(address) && hasBasebot && !wrongChain;

  const ep1Unlocked = canReadPublic;
  const ep2Unlocked = canPlayGated && Boolean(progress?.ep1);
  const ep3Unlocked = canPlayGated && Boolean(progress?.ep2);
  const ep4Unlocked = canPlayGated && Boolean(progress?.ep3);
  const ep5Unlocked = canPlayGated && Boolean(progress?.ep4);

  /* ───────── ROUTING (NO EARLY RETURNS) ───────── */

  if (mode !== "hub") {
    switch (mode) {
      case "prologue":
        return <PrologueSilenceInDarkness onExit={() => setMode("hub")} />;

      case "ep1":
        return tokenIdString ? (
          <EpisodeOne tokenId={tokenIdString} onExit={() => setMode("hub")} />
        ) : null;

      case "ep2":
        return tokenIdString && ep2Unlocked ? (
          <EpisodeTwo tokenId={tokenIdString} onExit={() => setMode("hub")} />
        ) : null;

      case "ep3":
        return tokenIdString && ep3Unlocked ? (
          <EpisodeThree tokenId={tokenIdString} onExit={() => setMode("hub")} />
        ) : null;

      case "ep4":
        return tokenIdString && ep4Unlocked ? (
          <EpisodeFour tokenId={tokenIdString} onExit={() => setMode("hub")} />
        ) : null;

      case "ep5":
        return tokenIdString && ep5Unlocked ? (
          <EpisodeFive tokenId={tokenIdString} onExit={() => setMode("hub")} />
        ) : null;

      case "bonus":
        return tokenIdString && bonusUnlocked ? (
          <BonusEcho onExit={() => setMode("hub")} />
        ) : null;

      default:
        return null;
    }
  }

  /* ───────── HUB UI ───────── */

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.10), transparent 62%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.12), transparent 60%), #020617",
        color: "white",
        padding: "40px 16px 64px",
      }}
    >
      {/* FID loading overlay (non-blocking) */}
      {fid === undefined && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: "rgba(2,6,23,0.85)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
          }}
        >
          Waiting for Farcaster identity…
        </div>
      )}

      <header style={{ maxWidth: 1200, margin: "0 auto 28px" }}>
        <div style={{ opacity: 0.6, letterSpacing: 2, fontSize: 11 }}>
          BASEBOTS
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 950 }}>Core Memory</h1>
        <p style={{ opacity: 0.75, maxWidth: 720, marginTop: 8 }}>
          Your choices are written on-chain. The system remembers what you commit.
        </p>
      </header>

      {/* CORE SEQUENCE */}
      <section style={{ maxWidth: 1200, margin: "0 auto 48px" }}>
        <h3 style={{ letterSpacing: 2, fontSize: 12, opacity: 0.75 }}>
          CORE SEQUENCE
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
            marginTop: 18,
          }}
        >
          {[
            { id: "ep1", title: "Awakening Protocol", img: "/story/01-awakening.png", unlocked: ep1Unlocked },
            { id: "ep2", title: "Signal Fracture", img: "/story/ep2.png", unlocked: ep2Unlocked },
            { id: "ep3", title: "Fault Lines", img: "/story/ep3.png", unlocked: ep3Unlocked },
            { id: "ep4", title: "Threshold", img: "/story/ep4.png", unlocked: ep4Unlocked },
            { id: "ep5", title: "Emergence", img: "/story/ep5.png", unlocked: ep5Unlocked },
          ].map((ep) => (
            <article
              key={ep.id}
              style={{
                borderRadius: 22,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.14)",
                padding: 20,
                opacity: ep.unlocked ? 1 : 0.55,
              }}
            >
              <img
                src={ep.img}
                alt={ep.title}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  marginBottom: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
              <h2 style={{ fontWeight: 900 }}>{ep.title}</h2>

              <button
                disabled={!ep.unlocked}
                onClick={() => setMode(ep.id as Mode)}
                style={{
                  marginTop: 14,
                  width: "100%",
                  borderRadius: 999,
                  padding: "10px 14px",
                  fontWeight: 900,
                  fontSize: 12,
                  background: ep.unlocked
                    ? "linear-gradient(90deg, #38bdf8, #a855f7)"
                    : "rgba(255,255,255,0.08)",
                  color: ep.unlocked ? "#020617" : "rgba(255,255,255,0.6)",
                  border: "none",
                  cursor: ep.unlocked ? "pointer" : "not-allowed",
                }}
              >
                {ep.unlocked ? "Enter Episode" : "NFT Required"}
              </button>
            </article>
          ))}
        </div>
      </section>

      {/* GLOBAL STATS */}
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h3 style={{ letterSpacing: 2, fontSize: 12, opacity: 0.75 }}>
          GLOBAL INTERPRETATION METRICS
        </h3>

        <div
          style={{
            marginTop: 18,
            padding: 24,
            borderRadius: 22,
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.14)",
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 900 }}>
            {totalFinalized}
          </div>
          <div style={{ opacity: 0.7, marginTop: 6 }}>
            Profiles finalized across the network
          </div>
        </div>
      </section>
    </main>
  );
}
