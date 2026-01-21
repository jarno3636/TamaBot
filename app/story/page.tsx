// app/story/page.tsx
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

type CoreProgress = {
  ep1: boolean;
  ep2: boolean;
  ep3: boolean;
  ep4: boolean;
  ep5: boolean;
  finalized: boolean;
};

function nextCoreMode(flags?: Partial<CoreProgress>) {
  if (!flags?.ep1) return "ep1";
  if (!flags?.ep2) return "ep2";
  if (!flags?.ep3) return "ep3";
  if (!flags?.ep4) return "ep4";
  return "ep5";
}

function statusOf(opts: { unlocked: boolean; done?: boolean; current?: boolean; requiresNFT?: boolean }) {
  if (opts.done) return "COMPLETE";
  if (!opts.unlocked) return opts.requiresNFT ? "NFT REQUIRED" : "LOCKED";
  if (opts.current) return "IN PROGRESS";
  return "AVAILABLE";
}

function badgeTone(status: string) {
  switch (status) {
    case "COMPLETE":
      return {
        bg: "rgba(34,197,94,0.92)",
        fg: "#02110a",
        ring: "rgba(34,197,94,0.35)",
      };
    case "IN PROGRESS":
      return {
        bg: "rgba(250,204,21,0.92)",
        fg: "#1a1201",
        ring: "rgba(250,204,21,0.35)",
      };
    case "AVAILABLE":
      return {
        bg: "rgba(56,189,248,0.92)",
        fg: "#020617",
        ring: "rgba(56,189,248,0.35)",
      };
    case "NFT REQUIRED":
      return {
        bg: "rgba(168,85,247,0.92)",
        fg: "#08010f",
        ring: "rgba(168,85,247,0.35)",
      };
    default:
      return {
        bg: "rgba(255,255,255,0.22)",
        fg: "rgba(255,255,255,0.92)",
        ring: "rgba(255,255,255,0.18)",
      };
  }
}

function tinyLabel(status: string) {
  // accessibility: clear + short
  if (status === "NFT REQUIRED") return "NFT required";
  if (status === "IN PROGRESS") return "In progress";
  return status.toLowerCase();
}

function cx(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

/* ─────────────────────────────────────────────
 * Episode Card (Premium + Accessible)
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
  current?: boolean;
  requiresNFT?: boolean;

  isBonus?: boolean;
  isMeta?: boolean;
  size?: "core" | "sub";

  cta?: string;
  onClick?: () => void;
}) {
  const locked = !ep.unlocked;
  const status = statusOf({
    unlocked: ep.unlocked,
    done: ep.done,
    current: ep.current,
    requiresNFT: ep.requiresNFT,
  });

  const tone = badgeTone(status);
  const cardRadius = ep.size === "sub" ? 18 : 24;
  const imgH = ep.size === "sub" ? 150 : 220;

  return (
    <article
      aria-disabled={locked}
      style={{
        borderRadius: cardRadius,
        overflow: "hidden",
        position: "relative",
        border: locked ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(56,189,248,0.34)",
        background: ep.isMeta
          ? "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.35))"
          : "rgba(0,0,0,0.35)",
        boxShadow: locked ? "0 18px 60px rgba(0,0,0,0.65)" : "0 28px 90px rgba(56,189,248,0.16)",
        opacity: locked ? 0.74 : 1,
        transform: "translateZ(0)",
      }}
    >
      {/* Focus ring target */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -1,
          borderRadius: cardRadius + 1,
          pointerEvents: "none",
          boxShadow: ep.current ? `0 0 0 6px ${tone.ring}` : "none",
          opacity: ep.current ? 1 : 0,
          transition: "opacity 180ms ease",
        }}
      />

      <div style={{ position: "relative" }}>
        <img
          src={ep.img}
          alt=""
          aria-hidden
          style={{
            width: "100%",
            height: imgH,
            objectFit: "cover",
            display: "block",
            filter: locked ? "grayscale(0.7) brightness(0.62) contrast(1.20)" : "none",
          }}
        />

        {/* vignette */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(2,6,23,0.05) 0%, rgba(2,6,23,0.60) 70%, rgba(2,6,23,0.88) 100%)",
            pointerEvents: "none",
          }}
        />

        {/* subtle scanline only on locked */}
        <div
          aria-hidden
          style={{
            pointerEvents: "none",
            position: "absolute",
            inset: 0,
            opacity: locked ? 0.45 : 0,
            background:
              "repeating-linear-gradient(180deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 2px, transparent 6px)",
            mixBlendMode: "overlay",
            transition: "opacity 160ms ease",
          }}
        />

        {/* badge */}
        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 10px",
            borderRadius: 999,
            background: tone.bg,
            color: tone.fg,
            fontSize: 10,
            fontWeight: 950,
            letterSpacing: 0.7,
            textTransform: "uppercase",
          }}
          aria-label={`Status: ${tinyLabel(status)}`}
        >
          {status}
          {status === "IN PROGRESS" && (
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "rgba(2,6,23,0.75)",
                boxShadow: "0 0 0 0 rgba(2,6,23,0.4)",
                animation: "bbPulse 1.4s infinite",
              }}
            />
          )}
        </div>
      </div>

      <div style={{ padding: ep.size === "sub" ? 16 : 20 }}>
        <h2
          style={{
            fontWeight: 950,
            fontSize: ep.size === "sub" ? 14 : 16,
            letterSpacing: 0.2,
            color: "rgba(255,255,255,0.94)",
            margin: 0,
          }}
        >
          {ep.title}
        </h2>

        <p
          style={{
            fontSize: 12,
            opacity: 0.74,
            marginTop: 8,
            marginBottom: 0,
            lineHeight: 1.45,
            color: "rgba(255,255,255,0.74)",
          }}
        >
          {ep.note}
        </p>

        <button
          type="button"
          disabled={locked || !ep.onClick}
          onClick={ep.onClick}
          aria-disabled={locked || !ep.onClick}
          className="bb-ep-btn"
          style={{
            marginTop: 14,
            width: "100%",
            borderRadius: 999,
            padding: ep.size === "sub" ? "10px 12px" : "11px 14px",
            fontSize: 12,
            fontWeight: 950,
            letterSpacing: 0.3,
            border: "1px solid rgba(255,255,255,0.16)",
            background: locked
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.85))",
            color: locked ? "rgba(255,255,255,0.62)" : "#020617",
            cursor: locked || !ep.onClick ? "not-allowed" : "pointer",
            outline: "none",
            boxShadow: locked ? "none" : "0 16px 60px rgba(56,189,248,0.14)",
            transition: "transform 120ms ease, filter 120ms ease",
          }}
        >
          {locked ? status : ep.cta ?? "▶ Enter Episode"}
        </button>

        {/* assistive hint */}
        {locked && (
          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,0.52)", lineHeight: 1.35 }}>
            {status === "NFT REQUIRED"
              ? "Connect your wallet on Base with your Basebot to unlock."
              : "Complete prior episodes to unlock."}
          </div>
        )}
      </div>
    </article>
  );
}

/* ─────────────────────────────────────────────
 * Page
 * ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<
    "hub" | "prologue" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "bonus"
  >("hub");

  const { address, chain } = useAccount();
  const fid = useFid();

  /**
   * CRITICAL FIX:
   * - Do NOT pass bigint through React props
   * - Keep tokenId stable as a string
   * - Convert to bigint only inside the episode components
   */
  const fidString = useMemo(() => {
    if (typeof fid === "number" && Number.isInteger(fid) && fid > 0) return String(fid);
    if (typeof fid === "string" && /^\d+$/.test(fid)) return fid;
    return undefined;
  }, [fid]);

  const hasToken = Boolean(fidString);
  const wrongChain = Boolean(chain?.id) && chain?.id !== BASE_CHAIN_ID;

  // tokenURI gate (contract uses tokenId == fid)
  const { data: tokenUri, isLoading: tokenUriLoading } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: fidString ? ([BigInt(fidString)] as unknown as [bigint]) : undefined,
    query: { enabled: hasToken },
  });

  const hasBasebot =
    typeof tokenUri === "string" && tokenUri.startsWith("data:application/json;base64,");

  // progress flags
  const { data: progressFlags } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getProgressFlags",
    args: fidString ? ([BigInt(fidString)] as unknown as [bigint]) : undefined,
    query: { enabled: hasToken && hasBasebot },
  });

  const progress = progressFlags as CoreProgress | undefined;

  // bonus bits
  const { data: hasB1 } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "hasBonusBit",
    args: fidString ? ([BigInt(fidString), BONUS1_BIT] as unknown as [bigint, number]) : undefined,
    query: { enabled: hasToken && hasBasebot },
  });

  const { data: hasB2 } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "hasBonusBit",
    args: fidString ? ([BigInt(fidString), BONUS2_BIT] as unknown as [bigint, number]) : undefined,
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

  /* ROUTING (ALWAYS MOUNT with stable string tokenId) */
  if (mode !== "hub") {
    const map: Record<string, React.ReactNode> = {
      ep1: fidString ? <EpisodeOne tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep2: fidString ? <EpisodeTwo tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep3: fidString ? <EpisodeThree tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep4: fidString ? <EpisodeFour tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      ep5: fidString ? <EpisodeFive tokenId={fidString} onExit={() => setMode("hub")} /> : null,
      prologue: <PrologueSilenceInDarkness onExit={() => setMode("hub")} />,
      bonus: <BonusEcho onExit={() => setMode("hub")} />,
    };
    return <>{map[mode]}</>;
  }

  /* HUB DATA (use your existing image paths/structure) */
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
      onClick: bonus2Unlocked ? () => setMode("bonus") : undefined, // or wire to Bonus2 component later
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

  const showGateNotice = !hasToken || !address || wrongChain || !hasBasebot;

  return (
    <main
      style={{
        minHeight: "100vh",
        color: "white",
        padding: "40px 16px 60px",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.12), transparent 62%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.14), transparent 60%), #020617",
      }}
    >
      <style>{`
        @keyframes bbPulse {
          0% { box-shadow: 0 0 0 0 rgba(2,6,23,0.35); transform: scale(1); }
          70% { box-shadow: 0 0 0 10px rgba(2,6,23,0.00); transform: scale(1.06); }
          100% { box-shadow: 0 0 0 0 rgba(2,6,23,0.00); transform: scale(1); }
        }
        .bb-ep-btn:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 4px rgba(56,189,248,0.45), 0 0 0 8px rgba(168,85,247,0.22) !important;
        }
        .bb-linklike:focus-visible {
          outline: none !important;
          box-shadow: 0 0 0 4px rgba(56,189,248,0.45) !important;
          border-radius: 10px;
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: 22 }}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: 0.2, lineHeight: 1.1 }}>
                BASEBOTS // STORY
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.70)", maxWidth: 760 }}>
                A premium narrative sequence bound to your Basebot. Choices are committed on-chain and unlock the corridor ahead.
              </div>
            </div>

            {/* Status pill */}
            <div
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.28)",
                padding: "10px 12px",
                minWidth: 280,
              }}
              aria-label="Connection status"
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.4, opacity: 0.8 }}>
                  SESSION STATUS
                </div>
                <div style={{ fontSize: 11, opacity: 0.75 }}>
                  {tokenUriLoading ? "Syncing…" : "Ready"}
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.76)", lineHeight: 1.35 }}>
                <div>
                  Wallet:{" "}
                  <span style={{ fontWeight: 800, color: address ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.62)" }}>
                    {address ? "Connected" : "Not connected"}
                  </span>
                </div>
                <div>
                  Network:{" "}
                  <span style={{ fontWeight: 800, color: !wrongChain ? "rgba(255,255,255,0.90)" : "rgba(251,113,133,0.95)" }}>
                    {wrongChain ? "Wrong chain (switch to Base)" : "Base"}
                  </span>
                </div>
                <div>
                  Token ID (FID):{" "}
                  <span style={{ fontWeight: 800, color: fidString ? "rgba(255,255,255,0.90)" : "rgba(255,255,255,0.62)" }}>
                    {fidString ?? "Not detected yet"}
                  </span>
                </div>
                <div>
                  Basebot NFT:{" "}
                  <span style={{ fontWeight: 800, color: hasBasebot ? "rgba(34,197,94,0.95)" : "rgba(255,255,255,0.62)" }}>
                    {hasBasebot ? "Detected" : "Not detected"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gate notice (accessible + explicit) */}
          {showGateNotice && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background:
                  "radial-gradient(900px 240px at 15% 0%, rgba(56,189,248,0.10), transparent 60%), rgba(255,255,255,0.04)",
                padding: 14,
                color: "rgba(255,255,255,0.78)",
                fontSize: 12,
                lineHeight: 1.4,
              }}
            >
              <div style={{ fontWeight: 950, letterSpacing: 1.2, fontSize: 11, opacity: 0.9 }}>
                ACCESS REQUIREMENTS
              </div>
              <div style={{ marginTop: 6 }}>
                {!fidString && "• Waiting for FID to resolve (tokenId == fid)."}
                {fidString && !address && "• Connect a wallet to play core episodes."}
                {fidString && address && wrongChain && "• Switch to Base (Chain ID 8453)."}
                {fidString && address && !wrongChain && !hasBasebot && "• Basebot NFT not detected for this tokenId."}
              </div>
              <div style={{ marginTop: 8, opacity: 0.72 }}>
                You can still view Episode 1’s card, but core progression requires wallet + Base + Basebot.
              </div>
            </div>
          )}
        </header>

        {/* CORE */}
        <section style={{ margin: "0 auto 36px" }} aria-label="Core episodes">
          <h3 style={{ opacity: 0.88, letterSpacing: 1.8, fontSize: 12, fontWeight: 950, marginBottom: 12 }}>
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
        <section style={{ margin: "0 auto 36px" }} aria-label="Archival echoes">
          <h3 style={{ opacity: 0.88, letterSpacing: 1.8, fontSize: 12, fontWeight: 950, marginBottom: 12 }}>
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
        <section style={{ margin: "0 auto" }} aria-label="Meta and global cards">
          <h3 style={{ opacity: 0.88, letterSpacing: 1.8, fontSize: 12, fontWeight: 950, marginBottom: 12 }}>
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

        {/* Footer note */}
        <footer style={{ marginTop: 28, fontSize: 11, color: "rgba(255,255,255,0.50)", lineHeight: 1.4 }}>
          Tip: If your FID is correct but Basebot NFT still shows “Not detected”, verify the contract’s <code>tokenURI</code>{" "}
          returns <code>data:application/json;base64,...</code> for that tokenId and that your RPC is on Base mainnet.
        </footer>
      </div>
    </main>
  );
}
