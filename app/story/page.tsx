"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";

import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";
import BonusEchoArchive from "@/components/story/BonusEchoArchive";

import { BASEBOTS } from "@/lib/abi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ─────────────────────────────────────────────
 * Config
 * ───────────────────────────────────────────── */
const BASE_CHAIN_ID = 8453;

/* ─────────────────────────────────────────────
 * Types / Helpers
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

function statusOf(opts: {
  unlocked: boolean;
  done?: boolean;
  current?: boolean;
  requiresNFT?: boolean;
}) {
  if (opts.done) return "COMPLETE";
  if (!opts.unlocked) return opts.requiresNFT ? "NFT REQUIRED" : "LOCKED";
  if (opts.current) return "IN PROGRESS";
  return "AVAILABLE";
}

function badgeTone(status: string) {
  switch (status) {
    case "COMPLETE":
      return { bg: "rgba(34,197,94,0.92)", fg: "#02110a", ring: "rgba(34,197,94,0.35)" };
    case "IN PROGRESS":
      return { bg: "rgba(250,204,21,0.92)", fg: "#1a1201", ring: "rgba(250,204,21,0.35)" };
    case "AVAILABLE":
      return { bg: "rgba(56,189,248,0.92)", fg: "#020617", ring: "rgba(56,189,248,0.35)" };
    case "NFT REQUIRED":
      return { bg: "rgba(168,85,247,0.92)", fg: "#08010f", ring: "rgba(168,85,247,0.35)" };
    default:
      return { bg: "rgba(255,255,255,0.22)", fg: "rgba(255,255,255,0.92)", ring: "rgba(255,255,255,0.18)" };
  }
}

/* ─────────────────────────────────────────────
 * Episode Card
 * ───────────────────────────────────────────── */

function EpisodeCard(ep: {
  title: string;
  note: string;
  img: string;
  unlocked: boolean;
  done?: boolean;
  current?: boolean;
  requiresNFT?: boolean;
  distorted?: boolean;
  cta?: string;
  onClick?: () => void;
}) {
  const locked = !ep.unlocked;
  const status = statusOf(ep);
  const tone = badgeTone(status);

  return (
    <article
      aria-disabled={locked}
      style={{
        borderRadius: 22,
        overflow: "hidden",
        border: locked ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(56,189,248,0.30)",
        background: "rgba(0,0,0,0.35)",
        opacity: locked ? 0.76 : 1,
        boxShadow: locked ? "0 16px 54px rgba(0,0,0,0.62)" : "0 26px 84px rgba(56,189,248,0.12)",
      }}
    >
      <div style={{ position: "relative" }}>
        <img
          src={ep.img}
          alt=""
          aria-hidden
          style={{
            width: "100%",
            height: 200,
            objectFit: "cover",
            display: "block",
            filter: locked ? "grayscale(0.85) brightness(0.56) contrast(1.15)" : "none",
          }}
        />

        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(2,6,23,0.05), rgba(2,6,23,0.88))",
          }}
        />

        {ep.distorted && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.10) 0px, rgba(255,255,255,0.10) 1px, transparent 3px, transparent 7px)",
              mixBlendMode: "overlay",
              opacity: 0.85,
            }}
          />
        )}

        <div
          style={{
            position: "absolute",
            left: 12,
            top: 12,
            padding: "5px 10px",
            borderRadius: 999,
            background: tone.bg,
            color: tone.fg,
            fontSize: 10,
            fontWeight: 950,
            letterSpacing: 0.7,
            textTransform: "uppercase",
            boxShadow: ep.current ? `0 0 0 6px ${tone.ring}` : "none",
          }}
        >
          {status}
        </div>
      </div>

      <div style={{ padding: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 950, margin: 0 }}>{ep.title}</h2>
        <p style={{ fontSize: 12, opacity: 0.76, marginTop: 8, marginBottom: 0, lineHeight: 1.45 }}>
          {ep.note}
        </p>

        <button
          type="button"
          disabled={locked || !ep.onClick}
          onClick={ep.onClick}
          style={{
            marginTop: 14,
            width: "100%",
            borderRadius: 999,
            padding: "10px",
            fontSize: 12,
            fontWeight: 950,
            background: locked
              ? "rgba(255,255,255,0.08)"
              : "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.85))",
            color: locked ? "rgba(255,255,255,0.6)" : "#020617",
            cursor: locked || !ep.onClick ? "not-allowed" : "pointer",
            border: "1px solid rgba(255,255,255,0.16)",
          }}
        >
          {locked ? status : ep.cta ?? "▶ Enter"}
        </button>

        {locked && (
          <div style={{ marginTop: 10, fontSize: 11, opacity: 0.6, lineHeight: 1.35 }}>
            {status === "NFT REQUIRED"
              ? "Connect wallet on Base + own a Basebot NFT to unlock."
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
    "hub" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5" | "prologue" | "bonus1" | "bonus2"
  >("hub");

  const { address, chain } = useAccount();

  const chainId = chain?.id;
  const wrongChain = chainId !== undefined && chainId !== BASE_CHAIN_ID;

  // 1) Check if wallet owns any Basebots
  const { data: balanceRaw } = useReadContract({
    ...BASEBOTS,
    functionName: "balanceOf",
    args: address ? ([address] as [`0x${string}`]) : undefined,
    query: { enabled: Boolean(address) },
  });

  const balance = typeof balanceRaw === "bigint" ? balanceRaw : BigInt(0);
  const hasAnyBasebot = balance > BigInt(0);

  // 2) Get first tokenId owned by wallet (requires ERC721Enumerable)
  const { data: tokenIdRaw, isError: tokenIdError } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenOfOwnerByIndex",
    args: address ? ([address, BigInt(0)] as [`0x${string}`, bigint]) : undefined,
    query: { enabled: Boolean(address) && hasAnyBasebot },
  });

  const tokenIdString = useMemo(() => {
    if (typeof tokenIdRaw === "bigint") return tokenIdRaw.toString();
    return null;
  }, [tokenIdRaw]);

  // 3) Optional: tokenURI presence check (keeps your previous NFT gating semantics)
  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: tokenIdString ? ([BigInt(tokenIdString)] as [bigint]) : undefined,
    query: { enabled: Boolean(tokenIdString) },
  });

  const hasBasebot =
    typeof tokenUri === "string" && tokenUri.startsWith("data:application/json;base64,");

  // 4) Progress flags keyed by tokenId
  const { data: progressFlags } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getProgressFlags",
    args: tokenIdString ? ([BigInt(tokenIdString)] as [bigint]) : undefined,
    query: { enabled: Boolean(tokenIdString) && hasBasebot },
  });

  const progress = progressFlags as CoreProgress | undefined;

  const canPlayCore = Boolean(address) && hasBasebot && !wrongChain;
  const currentCore = useMemo(() => nextCoreMode(progress), [progress]);

  // Bonus unlocks (your rule: 1,3,5)
  const prologueUnlocked = Boolean(progress?.ep1);
  const bonus1Unlocked = Boolean(progress?.ep3);
  const bonus2Unlocked = Boolean(progress?.ep5);

  /* ROUTING */
  if (mode !== "hub") {
    const exit = () => setMode("hub");

    // Don't allow entering core episodes without a tokenId
    if (!tokenIdString && (mode === "ep1" || mode === "ep2" || mode === "ep3" || mode === "ep4" || mode === "ep5")) {
      return (
        <main style={{ minHeight: "100vh", background: "#020617", color: "white", padding: 24 }}>
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ fontWeight: 950, fontSize: 18 }}>No Basebot detected</div>
            <div style={{ opacity: 0.75, marginTop: 10, lineHeight: 1.45 }}>
              Connect a wallet that holds a Basebot NFT to enter core episodes.
            </div>
            <button
              onClick={exit}
              style={{
                marginTop: 18,
                borderRadius: 999,
                padding: "10px 14px",
                fontWeight: 900,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(255,255,255,0.06)",
                color: "white",
              }}
            >
              Return to hub
            </button>
          </div>
        </main>
      );
    }

    switch (mode) {
      case "ep1":
        return <EpisodeOne tokenId={tokenIdString ?? ""} onExit={exit} />;
      case "ep2":
        return <EpisodeTwo tokenId={tokenIdString ?? ""} onExit={exit} />;
      case "ep3":
        return <EpisodeThree tokenId={tokenIdString ?? ""} onExit={exit} />;
      case "ep4":
        return <EpisodeFour tokenId={tokenIdString ?? ""} onExit={exit} />;
      case "ep5":
        return <EpisodeFive tokenId={tokenIdString ?? ""} onExit={exit} />;
      case "prologue":
        return <PrologueSilenceInDarkness onExit={exit} />;
      case "bonus1":
        return <BonusEcho onExit={exit} />;
      case "bonus2":
        return <BonusEchoArchive onExit={exit} />;
      default:
        return null;
    }
  }

  const showGateNotice =
    !address || wrongChain || !hasAnyBasebot || tokenIdError || !tokenIdString || !hasBasebot;

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px 16px 64px",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.12), transparent 62%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.14), transparent 60%), #020617",
        color: "white",
      }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Header */}
        <header style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 950, letterSpacing: 0.2, lineHeight: 1.1 }}>
                BASEBOTS // STORY
              </div>
              <div style={{ marginTop: 6, fontSize: 13, color: "rgba(255,255,255,0.70)", maxWidth: 760 }}>
                Choices are committed on-chain and unlock the corridor ahead.
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(0,0,0,0.30)",
                padding: 14,
                minWidth: 320,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: 1.4, opacity: 0.84 }}>
                SESSION STATUS
              </div>
              <div style={{ marginTop: 10, fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.78)" }}>
                <div>
                  Wallet:{" "}
                  <span style={{ fontWeight: 900, color: address ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.62)" }}>
                    {address ? "Connected" : "Not connected"}
                  </span>
                </div>
                <div>
                  Network:{" "}
                  <span style={{ fontWeight: 900, color: wrongChain ? "#fb7185" : "rgba(255,255,255,0.92)" }}>
                    {wrongChain ? "Wrong (switch to Base)" : "Base"}
                  </span>
                </div>
                <div>
                  Basebot NFT:{" "}
                  <span style={{ fontWeight: 900, color: hasBasebot ? "#22c55e" : "rgba(255,255,255,0.62)" }}>
                    {hasBasebot ? `Detected (token ${tokenIdString})` : hasAnyBasebot ? "Detected (verifying…)" : "Not detected"}
                  </span>
                </div>
                {tokenIdError && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#fb7185" }}>
                    tokenOfOwnerByIndex failed (contract may not be enumerable).
                  </div>
                )}
              </div>
            </div>
          </div>

          {showGateNotice && (
            <div
              role="status"
              aria-live="polite"
              style={{
                marginTop: 14,
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.04)",
                padding: 14,
                fontSize: 12,
                color: "rgba(255,255,255,0.78)",
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 950, letterSpacing: 1.2, fontSize: 11, opacity: 0.9 }}>
                ACCESS REQUIREMENTS
              </div>
              <div style={{ marginTop: 6 }}>
                {!address && "• Connect a wallet to play core episodes."}
                {address && wrongChain && "• Switch to Base mainnet (Chain ID 8453)."}
                {address && !wrongChain && !hasAnyBasebot && "• Wallet does not hold a Basebot NFT."}
                {address && !wrongChain && hasAnyBasebot && tokenIdError && "• Cannot read tokenId (contract may not support enumeration)."}
                {address && !wrongChain && hasAnyBasebot && !tokenIdError && !hasBasebot && "• Verifying token metadata…"}
              </div>
            </div>
          )}
        </header>

        {/* CORE */}
        <section aria-label="Core episodes">
          <h3 style={{ opacity: 0.88, letterSpacing: 1.8, fontSize: 12, fontWeight: 950, marginBottom: 12 }}>
            CORE SEQUENCE
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            <EpisodeCard
              title="Awakening Protocol"
              note="Initialization begins. Your first directive is recorded."
              img="/story/01-awakening.png"
              unlocked
              done={Boolean(progress?.ep1)}
              current={currentCore === "ep1"}
              cta="▶ Begin"
              onClick={() => setMode("ep1")}
            />
            <EpisodeCard
              title="Signal Fracture"
              note="Designation binding. A name becomes a constraint."
              img="/story/ep2.png"
              unlocked={canPlayCore && Boolean(progress?.ep1)}
              done={Boolean(progress?.ep2)}
              requiresNFT
              current={currentCore === "ep2"}
              cta="▶ Continue"
              onClick={() => setMode("ep2")}
            />
            <EpisodeCard
              title="Fault Lines"
              note="Contradictions form. You decide how the system thinks."
              img="/story/ep3.png"
              unlocked={canPlayCore && Boolean(progress?.ep2)}
              done={Boolean(progress?.ep3)}
              requiresNFT
              current={currentCore === "ep3"}
              cta="▶ Continue"
              onClick={() => setMode("ep3")}
            />
            <EpisodeCard
              title="Threshold"
              note="A profile is derived. The city prepares its response."
              img="/story/ep4.png"
              unlocked={canPlayCore && Boolean(progress?.ep3)}
              done={Boolean(progress?.ep4)}
              requiresNFT
              current={currentCore === "ep4"}
              cta="▶ Continue"
              onClick={() => setMode("ep4")}
            />
            <EpisodeCard
              title="Emergence"
              note="Surface access is negotiated. Outcomes are permanent."
              img="/story/ep5.png"
              unlocked={canPlayCore && Boolean(progress?.ep4)}
              done={Boolean(progress?.ep5)}
              requiresNFT
              current={currentCore === "ep5"}
              cta={Boolean(progress?.ep5) ? "▶ Review" : "▶ Enter"}
              onClick={() => setMode("ep5")}
            />
          </div>
        </section>

        {/* ARCHIVAL / BONUSES */}
        <section style={{ marginTop: 36 }} aria-label="Archival echoes">
          <h3 style={{ opacity: 0.88, letterSpacing: 1.8, fontSize: 12, fontWeight: 950, marginBottom: 12 }}>
            ARCHIVAL ECHOES
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            <EpisodeCard
              title="Prologue: Silence in Darkness"
              note="Unlocked by a special interaction in Episode 1."
              img="/story/prologue.png"
              unlocked={canPlayCore && prologueUnlocked}
              distorted={!prologueUnlocked}
              cta={prologueUnlocked ? "▶ Open" : "LOCKED"}
              onClick={prologueUnlocked ? () => setMode("prologue") : undefined}
            />
            <EpisodeCard
              title="Echo: Residual Memory"
              note="Unlocked by a special interaction in Episode 3."
              img="/story/b1.png"
              unlocked={canPlayCore && bonus1Unlocked}
              distorted={!bonus1Unlocked}
              cta={bonus1Unlocked ? "▶ Decrypt" : "LOCKED"}
              onClick={bonus1Unlocked ? () => setMode("bonus1") : undefined}
            />
            <EpisodeCard
              title="Echo: Redacted Layer"
              note="Unlocked by a special interaction in Episode 5."
              img="/story/b2.png"
              unlocked={canPlayCore && bonus2Unlocked}
              distorted={!bonus2Unlocked}
              cta={bonus2Unlocked ? "▶ Decrypt" : "LOCKED"}
              onClick={bonus2Unlocked ? () => setMode("bonus2") : undefined}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
