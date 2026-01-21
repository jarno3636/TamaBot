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

/* ─────────────────────────────────────────────
 * Config
 * ───────────────────────────────────────────── */

const BASE_CHAIN_ID = 8453;
const BONUS1_BIT = 1;
const BONUS2_BIT = 2;

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

function statusOf(opts: {
  unlocked: boolean;
  done?: boolean;
  requiresNFT?: boolean;
  current?: boolean;
}) {
  if (opts.done) return "COMPLETE";
  if (!opts.unlocked) return opts.requiresNFT ? "NFT REQUIRED" : "LOCKED";
  if (opts.current) return "CURRENT";
  return "AVAILABLE";
}

function badgeColorFor(status: string) {
  if (status === "COMPLETE") return "rgba(34,197,94,0.92)";
  if (status === "CURRENT") return "rgba(250,204,21,0.92)";
  if (status === "AVAILABLE") return "rgba(56,189,248,0.92)";
  if (status === "NFT REQUIRED") return "rgba(168,85,247,0.92)";
  return "rgba(255,255,255,0.35)";
}

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

/* ─────────────────────────────────────────────
 * Episode Card (FULL VERSION RESTORED)
 * ───────────────────────────────────────────── */

function EpisodeCard(ep: {
  id:
    | "prologue"
    | "ep1"
    | "ep2"
    | "ep3"
    | "ep4"
    | "ep5"
    | "bonus"
    | "bonus2"
    | null;
  title: string;
  note: string;
  img: string;
  unlocked: boolean;
  done?: boolean;
  requiresNFT?: boolean;
  isBonus?: boolean;
  isMeta?: boolean;
  size?: "core" | "sub";
  current?: boolean;
  cta?: string;
  onClick?: () => void;
}) {
  const locked = !ep.unlocked;
  const status = statusOf(ep);
  const badge = badgeColorFor(status);

  const cardRadius = ep.size === "sub" ? 18 : 24;
  const imgH = ep.size === "sub" ? 150 : 220;

  return (
    <article
      aria-disabled={locked}
      style={{
        borderRadius: cardRadius,
        overflow: "hidden",
        background: ep.isMeta
          ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.35))"
          : "rgba(0,0,0,0.35)",
        border: locked
          ? "1px solid rgba(255,255,255,0.12)"
          : "1px solid rgba(56,189,248,0.34)",
        boxShadow: locked
          ? "0 18px 60px rgba(0,0,0,0.65)"
          : "0 28px 90px rgba(56,189,248,0.15)",
        opacity: locked ? 0.7 : 1,
        position: "relative",
      }}
    >
      <div style={{ position: "relative" }}>
        <img
          src={ep.img}
          alt=""
          aria-hidden
          style={{
            width: "100%",
            height: imgH,
            objectFit: "cover",
            filter: locked
              ? "grayscale(0.7) brightness(0.65) contrast(1.25)"
              : "none",
          }}
        />

        {/* scanline overlay */}
        <div
          aria-hidden
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            opacity: locked ? 0.55 : 0,
            background:
              "repeating-linear-gradient(180deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 2px, transparent 6px)",
            mixBlendMode: "overlay",
          }}
        />

        {/* status badge */}
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            padding: "4px 10px",
            borderRadius: 999,
            background: badge,
            color: "#020617",
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: 0.6,
          }}
        >
          {status}
        </div>

        {/* current pulse */}
        {status === "CURRENT" && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              right: 12,
              top: 12,
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "rgba(250,204,21,0.95)",
              boxShadow: "0 0 0 0 rgba(250,204,21,0.55)",
              animation: "bbPulse 1.4s infinite",
            }}
          />
        )}
      </div>

      <div style={{ padding: ep.size === "sub" ? 16 : 20 }}>
        <h2
          style={{
            fontWeight: 900,
            fontSize: ep.size === "sub" ? 14 : 16,
          }}
        >
          {ep.title}
        </h2>

        <p
          style={{
            fontSize: 12,
            opacity: 0.72,
            marginTop: 6,
            lineHeight: 1.35,
          }}
        >
          {ep.note}
        </p>

        <button
          disabled={locked}
          onClick={ep.onClick}
          style={{
            marginTop: 12,
            width: "100%",
            borderRadius: 999,
            padding: ep.size === "sub" ? "9px 10px" : "10px 12px",
            fontSize: 12,
            fontWeight: 900,
            border: "1px solid rgba(255,255,255,0.16)",
            background: locked
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.85))",
            color: locked ? "rgba(255,255,255,0.60)" : "#020617",
            cursor: locked ? "not-allowed" : "pointer",
          }}
        >
          {locked ? status : ep.cta ?? "▶ Enter Episode"}
        </button>
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────
 * Story Page
 * ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<
    "hub" | "prologue" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "bonus"
  >("hub");

  const { address, chain } = useAccount();
  const fid = useFid();

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
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: hasToken },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  const { data: progressFlags } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getProgressFlags",
    args: tokenId ? [tokenId] : undefined,
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

  const { data: hasB1 } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "hasBonusBit",
    args: tokenId ? [tokenId, BONUS1_BIT] : undefined,
    query: { enabled: hasToken && hasBasebot },
  });

  const { data: hasB2 } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "hasBonusBit",
    args: tokenId ? [tokenId, BONUS2_BIT] : undefined,
    query: { enabled: hasToken && hasBasebot },
  });

  const canPlayCore = Boolean(address) && hasBasebot && !wrongChain;

  const ep1Unlocked = true;
  const ep2Unlocked = canPlayCore && Boolean(progress?.ep1);
  const ep3Unlocked = canPlayCore && Boolean(progress?.ep2);
  const ep4Unlocked = canPlayCore && Boolean(progress?.ep3);
  const ep5Unlocked = canPlayCore && Boolean(progress?.ep4);
  const ep5Done = Boolean(progress?.ep5);

  const prologueUnlocked = canPlayCore && Boolean(hasB1);
  const bonus1Unlocked = canPlayCore && Boolean(hasB1);
  const bonus2Unlocked = canPlayCore && Boolean(hasB2);

  const currentCore = useMemo(() => nextCoreMode(progress), [progress]);

  /* ROUTING */
  if (mode !== "hub") {
    const map: Record<string, React.ReactNode> = {
      ep1: tokenId ? <EpisodeOne tokenId={tokenId} onExit={() => setMode("hub")} /> : null,
      ep2: tokenId ? <EpisodeTwo tokenId={tokenId} onExit={() => setMode("hub")} /> : null,
      ep3: tokenId ? <EpisodeThree tokenId={tokenId} onExit={() => setMode("hub")} /> : null,
      ep4: tokenId ? <EpisodeFour tokenId={tokenId} onExit={() => setMode("hub")} /> : null,
      ep5: tokenId ? <EpisodeFive tokenId={tokenId} onExit={() => setMode("hub")} /> : null,
      prologue: <PrologueSilenceInDarkness onExit={() => setMode("hub")} />,
      bonus: <BonusEcho onExit={() => setMode("hub")} />,
    };

    return <>{map[mode]}</>;
  }

  /* HUB UI — FULL RESTORE */
  const coreEpisodes = [
    {
      id: "ep1" as const,
      title: "Awakening Protocol",
      unlocked: ep1Unlocked,
      done: Boolean(progress?.ep1),
      img: "/story/01-awakening.png",
      note: "Initialization begins. Your first directive is recorded.",
      requiresNFT: false,
      size: "core" as const,
      current: currentCore === "ep1",
      cta: "▶ Begin",
      onClick: () => setMode("ep1"),
    },
    {
      id: "ep2" as const,
      title: "Signal Fracture",
      unlocked: ep2Unlocked,
      done: Boolean(progress?.ep2),
      img: "/story/ep2.png",
      note: "Designation binding. A name becomes a constraint.",
      requiresNFT: true,
      size: "core" as const,
      current: currentCore === "ep2",
      cta: "▶ Continue",
      onClick: () => setMode("ep2"),
    },
    {
      id: "ep3" as const,
      title: "Fault Lines",
      unlocked: ep3Unlocked,
      done: Boolean(progress?.ep3),
      img: "/story/ep3.png",
      note: "Contradictions form. You decide how the system thinks.",
      requiresNFT: true,
      size: "core" as const,
      current: currentCore === "ep3",
      cta: "▶ Continue",
      onClick: () => setMode("ep3"),
    },
    {
      id: "ep4" as const,
      title: "Threshold",
      unlocked: ep4Unlocked,
      done: Boolean(progress?.ep4),
      img: "/story/ep4.png",
      note: "A profile is derived. The city prepares its response.",
      requiresNFT: true,
      size: "core" as const,
      current: currentCore === "ep4",
      cta: "▶ Continue",
      onClick: () => setMode("ep4"),
    },
    {
      id: "ep5" as const,
      title: "Emergence",
      unlocked: ep5Unlocked,
      done: ep5Done,
      img: "/story/ep5.png",
      note: "Surface access is negotiated. Outcomes are permanent.",
      requiresNFT: true,
      size: "core" as const,
      current: currentCore === "ep5",
      cta: ep5Done ? "▶ Review" : "▶ Enter",
      onClick: () => setMode("ep5"),
    },
  ];

  const prologueAndBonuses = [
    {
      id: "prologue" as const,
      title: "Prologue: Silence in Darkness",
      unlocked: prologueUnlocked,
      done: prologueUnlocked,
      img: "/story/prologue.png",
      note: "A dormant channel stirs. Something remembers you first.",
      isBonus: true,
      size: "sub" as const,
      cta: "▶ Open",
      onClick: () => setMode("prologue"),
    },
    {
      id: "bonus" as const,
      title: "Echo: Residual Memory",
      unlocked: bonus1Unlocked,
      done: Boolean(hasB1),
      img: "/story/b1.png",
      note: "Unindexed fragments recovered. The archive speaks back.",
      isBonus: true,
      size: "sub" as const,
      cta: "▶ Read",
      onClick: () => setMode("bonus"),
    },
    {
      id: "bonus2" as const,
      title: "Echo: Redacted Layer",
      unlocked: bonus2Unlocked,
      done: Boolean(hasB2),
      img: "/story/b2.png",
      note: "Unlocked by a fleeting key during Emergence.",
      isBonus: true,
      size: "sub" as const,
      cta: bonus2Unlocked ? "▶ Decrypt" : "LOCKED",
    },
  ];

  const metaCards = [
    {
      id: null,
      title: "Global Interpretation Metrics",
      unlocked: false,
      done: false,
      img: "/story/gs.png",
      note: "Live aggregation coming soon. (Placeholder UI)",
      isMeta: true,
      size: "sub" as const,
      cta: "Offline",
    },
  ];

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.10), transparent 62%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.12), transparent 60%), #020617",
        color: "white",
        padding: "40px 16px 60px",
      }}
    >
      <style>{`
        @keyframes bbPulse {
          0% { box-shadow: 0 0 0 0 rgba(250,204,21,0.50); transform: scale(1); }
          70% { box-shadow: 0 0 0 10px rgba(250,204,21,0.00); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(250,204,21,0.00); transform: scale(1); }
        }
      `}</style>

      {/* CORE */}
      <section style={{ maxWidth: 1200, margin: "0 auto 36px" }}>
        <h3 style={{ opacity: 0.85, letterSpacing: 1.8, fontSize: 12, fontWeight: 900 }}>
          CORE SEQUENCE
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {coreEpisodes.map((ep) => (
            <EpisodeCard key={ep.id} {...ep} />
          ))}
        </div>
      </section>

      {/* ARCHIVAL */}
      <section style={{ maxWidth: 1200, margin: "0 auto 36px" }}>
        <h3 style={{ opacity: 0.85, letterSpacing: 1.8, fontSize: 12, fontWeight: 900 }}>
          ARCHIVAL ECHOES
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {prologueAndBonuses.map((ep) => (
            <EpisodeCard key={ep.title} {...ep} />
          ))}
        </div>
      </section>

      {/* META */}
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h3 style={{ opacity: 0.85, letterSpacing: 1.8, fontSize: 12, fontWeight: 900 }}>
          META / GLOBAL
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 16,
          }}
        >
          {metaCards.map((m) => (
            <EpisodeCard key={m.title} {...m} />
          ))}
        </div>
      </section>
    </main>
  );
}
