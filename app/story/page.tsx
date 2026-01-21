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
 * Component
 * ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<
    "hub" | "prologue" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "bonus"
  >("hub");

  const { address, chain } = useAccount();
  const fid = useFid();

  /* robust FID → tokenId handling */
  const tokenId = useMemo(() => {
    try {
      if (typeof fid === "bigint") return fid;
      if (typeof fid === "number" && fid > 0) return BigInt(fid);
      if (typeof fid === "string" && /^\d+$/.test(fid)) return BigInt(fid);
      return undefined;
    } catch {
      return undefined;
    }
  }, [fid]);

  const hasToken = Boolean(tokenId);
  const wrongChain = Boolean(chain?.id) && chain?.id !== BASE_CHAIN_ID;

  /* ── Ownership gate via tokenURI ── */

  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: hasToken },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  /* ── Season 2 progress ── */

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

  /* ── Bonus bits ── */

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

  /* ── Core gating ── */

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

  /* ── Top status strip ── */
  const topStatus = useMemo(() => {
    if (!address)
      return {
        title: "Connect wallet",
        detail: "A link is required to read the archive.",
      };
    if (!hasToken)
      return {
        title: "FID not found",
        detail: "TokenId is derived from your Farcaster FID.",
      };
    if (wrongChain)
      return {
        title: "Wrong network",
        detail: "Switch to Base to access Core Memory.",
      };
    if (!hasBasebot)
      return {
        title: "No Basebot detected",
        detail: "Mint a Basebot to unlock Core Memory.",
      };
    return {
      title: "Link established",
      detail: `Basebot #${tokenId?.toString()} recognized. Core Memory available.`,
    };
  }, [address, hasToken, wrongChain, hasBasebot, tokenId]);

  /* ───────────────── ROUTE ───────────────── */
  if (mode !== "hub") {
    const map: Partial<Record<typeof mode, React.ReactNode>> = {
      prologue: <PrologueSilenceInDarkness onExit={() => setMode("hub")} />,

      ep1:
        tokenId !== undefined ? (
          <EpisodeOne tokenId={tokenId} onExit={() => setMode("hub")} />
        ) : null,

      ep2:
        tokenId !== undefined ? (
          <EpisodeTwo tokenId={tokenId} onExit={() => setMode("hub")} />
        ) : null,

      ep3:
        tokenId !== undefined ? (
          <EpisodeThree tokenId={tokenId} onExit={() => setMode("hub")} />
        ) : null,

      ep4:
        tokenId !== undefined ? (
          <EpisodeFour tokenId={tokenId} onExit={() => setMode("hub")} />
        ) : null,

      ep5:
        tokenId !== undefined ? (
          <EpisodeFive tokenId={tokenId} onExit={() => setMode("hub")} />
        ) : null,

      bonus: <BonusEcho onExit={() => setMode("hub")} />,
    };

    return (
      map[mode] ?? (
        <main
          style={{
            minHeight: "100vh",
            background: "#020617",
            color: "white",
            padding: 24,
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ fontWeight: 900, fontSize: 18 }}>UNKNOWN ROUTE</div>
            <button
              onClick={() => setMode("hub")}
              style={{
                marginTop: 14,
                borderRadius: 999,
                padding: "10px 14px",
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 12,
              }}
            >
              Return to hub
            </button>
          </div>
        </main>
      )
    );
  }

  return (
    <main
      role="main"
      aria-label="Basebots: Core Memory"
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.10), transparent 62%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.12), transparent 60%), #020617",
        color: "white",
        padding: "40px 16px 60px",
      }}
    >
      {/* inline keyframes */}
      <style>{`
        @keyframes bbPulse {
          0% { box-shadow: 0 0 0 0 rgba(250,204,21,0.50); transform: scale(1); }
          70% { box-shadow: 0 0 0 10px rgba(250,204,21,0.00); transform: scale(1.05); }
          100% { box-shadow: 0 0 0 0 rgba(250,204,21,0.00); transform: scale(1); }
        }
      `}</style>

      <header style={{ maxWidth: 1200, margin: "0 auto 22px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                opacity: 0.6,
                letterSpacing: 2,
                fontWeight: 900,
              }}
            >
              BASEBOTS
            </div>
            <h1
              style={{
                fontSize: 34,
                fontWeight: 950,
                marginTop: 4,
                letterSpacing: -0.6,
              }}
            >
              Core Memory
            </h1>
            <p
              style={{
                marginTop: 8,
                opacity: 0.72,
                maxWidth: 720,
                lineHeight: 1.4,
              }}
            >
              Your choices are written to chain. The system doesn’t remember what
              you said — it remembers what you committed.
            </p>
          </div>

          {/* status chip */}
          <div
            style={{
              minWidth: 280,
              flex: "0 0 auto",
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(0,0,0,0.35)",
              padding: 14,
              boxShadow: "0 22px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 12, letterSpacing: 0.4 }}>
              {topStatus.title}
            </div>
            <div
              style={{
                marginTop: 6,
                fontSize: 12,
                opacity: 0.65,
                lineHeight: 1.35,
              }}
            >
              {topStatus.detail}
            </div>
          </div>
        </div>

        {/* quick actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
          <button
            onClick={() => setMode(currentCore as any)}
            disabled={!canPlayCore}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.16)",
              background: canPlayCore
                ? "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.85))"
                : "rgba(255,255,255,0.06)",
              color: canPlayCore ? "#020617" : "rgba(255,255,255,0.55)",
              cursor: canPlayCore ? "pointer" : "not-allowed",
            }}
          >
            ▶ Resume Core
          </button>

          <button
            onClick={() => setMode("prologue")}
            disabled={!prologueUnlocked}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              fontSize: 12,
              fontWeight: 900,
              border: "1px solid rgba(255,255,255,0.16)",
              background: prologueUnlocked
                ? "rgba(255,255,255,0.06)"
                : "rgba(255,255,255,0.04)",
              color: prologueUnlocked ? "white" : "rgba(255,255,255,0.55)",
              cursor: prologueUnlocked ? "pointer" : "not-allowed",
            }}
          >
            Open Prologue
          </button>
        </div>
      </header>

      {/* CORE */}
      <section style={{ maxWidth: 1200, margin: "0 auto 36px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <h3
            style={{
              opacity: 0.85,
              marginBottom: 14,
              letterSpacing: 1.8,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            CORE SEQUENCE
          </h3>
          <div style={{ fontSize: 11, opacity: 0.6 }}>
            Ep2+ requires Basebots NFT ownership (tokenId = FID).
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 24,
          }}
        >
          {coreEpisodes.map((ep) => (
            <EpisodeCard
              key={ep.id}
              id={ep.id}
              title={ep.title}
              note={ep.note}
              img={ep.img}
              unlocked={ep.unlocked}
              done={ep.done}
              requiresNFT={ep.requiresNFT}
              size={ep.size}
              current={ep.current}
              cta={ep.cta}
            />
          ))}
        </div>
      </section>

      {/* ARCHIVE: smaller tier, visually separated */}
      <section style={{ maxWidth: 1200, margin: "0 auto 36px" }}>
        <div
          style={{
            borderRadius: 22,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(0,0,0,0.22)",
            padding: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <h3
              style={{
                opacity: 0.85,
                marginBottom: 14,
                letterSpacing: 1.8,
                fontSize: 12,
                fontWeight: 900,
              }}
            >
              ARCHIVAL ECHOES
            </h3>
            <div style={{ fontSize: 11, opacity: 0.6 }}>
              Bonuses are tiered. Some only appear when acknowledged.
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
            }}
          >
            {prologueAndBonuses.map((ep) => (
              <EpisodeCard
                key={ep.title}
                id={ep.id}
                title={ep.title}
                note={ep.note}
                img={ep.img}
                unlocked={ep.unlocked}
                done={ep.done}
                isBonus
                size="sub"
                cta={ep.cta}
              />
            ))}
          </div>
        </div>
      </section>

      {/* META */}
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h3
          style={{
            opacity: 0.85,
            marginBottom: 14,
            letterSpacing: 1.8,
            fontSize: 12,
            fontWeight: 900,
          }}
        >
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
            <EpisodeCard
              key={m.title}
              id={m.id}
              title={m.title}
              note={m.note}
              img={m.img}
              unlocked={m.unlocked}
              done={m.done}
              isMeta
              size="sub"
              cta={m.cta}
            />
          ))}
        </div>
      </section>

      <footer
        style={{
          marginTop: 46,
          textAlign: "center",
          fontSize: 11,
          opacity: 0.55,
          maxWidth: 900,
          marginLeft: "auto",
          marginRight: "auto",
          lineHeight: 1.4,
        }}
      >
        Some records persist only because they were never finalized.
        <br />
        If a card looks distorted, it isn’t broken — it’s refusing.
      </footer>
    </main>
  );
}
