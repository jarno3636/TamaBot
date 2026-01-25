"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
} from "wagmi";

import useFid from "@/hooks/useFid";

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

const BASE_CHAIN_ID = 8453;

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

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { fid } = useFid();
  const isBase = chain?.id === BASE_CHAIN_ID;

  const tokenId = useMemo(
    () => (typeof fid === "number" && fid > 0 ? BigInt(fid) : undefined),
    [fid]
  );

  /* ───────── NFT GATE ───────── */

  const { data: balance } = useReadContract({
    ...BASEBOTS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isBase) },
  });

  const nftGatePassed = typeof balance === "bigint" && balance > 0n;

  /* ───────── ON-CHAIN STATE ───────── */

  const {
    data: botState,
    refetch: refetchBotState,
  } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: tokenId ? [tokenId] : undefined,
    query: { enabled: Boolean(tokenId && nftGatePassed) },
  });

  /* ───────── LIVE EVENT LISTENERS (FIXED) ───────── */

  useEffect(() => {
    if (!publicClient || !tokenId) return;

    const unwatchEpisode = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        for (const log of logs as Array<{ args?: { tokenId?: bigint } }>) {
          if (log.args?.tokenId === tokenId) {
            refetchBotState();
          }
        }
      },
    });

    const unwatchFinalized = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "FinalizedProfile",
      onLogs: (logs) => {
        for (const log of logs as Array<{ args?: { tokenId?: bigint } }>) {
          if (log.args?.tokenId === tokenId) {
            refetchBotState();
          }
        }
      },
    });

    return () => {
      unwatchEpisode();
      unwatchFinalized();
    };
  }, [publicClient, tokenId, refetchBotState]);

  const state = botState
    ? {
        ep1: (botState as any).ep1Set,
        ep2: (botState as any).ep2Set,
        ep3: (botState as any).ep3Set,
        ep4: (botState as any).ep4Set,
        ep5: (botState as any).ep5Set,
        finalized: (botState as any).finalized,
      }
    : null;

  /* ───────── UNLOCK LOGIC ───────── */

  const ep1Unlocked = nftGatePassed;
  const ep2Unlocked = nftGatePassed && state?.ep1;
  const ep3Unlocked = nftGatePassed && state?.ep2;
  const ep4Unlocked = nftGatePassed && state?.ep3;
  const ep5Unlocked = nftGatePassed && state?.ep4;

  const prologueUnlocked = state?.ep1;
  const bonusUnlocked = state?.ep3;
  const archiveUnlocked = state?.ep5;

  /* ───────── CURRENT NODE ───────── */

  const currentNode =
    !state?.ep1
      ? "ep1"
      : !state.ep2
      ? "ep2"
      : !state.ep3
      ? "ep3"
      : !state.ep4
      ? "ep4"
      : !state.ep5
      ? "ep5"
      : null;

  /* ───────── ROUTING ───────── */

  if (mode !== "hub") {
    if (!nftGatePassed || !tokenId) return null;

    switch (mode) {
      case "prologue":
        return prologueUnlocked ? (
          <PrologueSilenceInDarkness onExit={() => setMode("hub")} />
        ) : null;

      case "ep1":
        return (
          <EpisodeOne
            tokenId={tokenId.toString()}
            onExit={() => setMode("hub")}
          />
        );

      case "ep2":
        return ep2Unlocked ? (
          <EpisodeTwo tokenId={tokenId.toString()} onExit={() => setMode("hub")} />
        ) : null;

      case "ep3":
        return ep3Unlocked ? (
          <EpisodeThree tokenId={tokenId.toString()} onExit={() => setMode("hub")} />
        ) : null;

      case "ep4":
        return ep4Unlocked ? (
          <EpisodeFour tokenId={tokenId.toString()} onExit={() => setMode("hub")} />
        ) : null;

      case "ep5":
        return ep5Unlocked ? (
          <EpisodeFive tokenId={tokenId.toString()} onExit={() => setMode("hub")} />
        ) : null;

      case "bonus":
        return bonusUnlocked ? <BonusEcho onExit={() => setMode("hub")} /> : null;

      case "archive":
        return archiveUnlocked ? (
          <BonusEchoArchive onExit={() => setMode("hub")} />
        ) : null;

      default:
        return null;
    }
  }

  /* ───────── HUB UI ───────── */

  const episodes = [
    { id: "ep1", title: "Awakening Protocol", img: "/story/01-awakening.png", unlocked: ep1Unlocked },
    { id: "ep2", title: "Signal Fracture", img: "/story/ep2.png", unlocked: ep2Unlocked },
    { id: "ep3", title: "Fault Lines", img: "/story/ep3.png", unlocked: ep3Unlocked },
    { id: "ep4", title: "Threshold", img: "/story/ep4.png", unlocked: ep4Unlocked },
    { id: "ep5", title: "Emergence", img: "/story/ep5.png", unlocked: ep5Unlocked },
  ];

  return (
    <main style={{ minHeight: "100vh", background: "#020617", color: "white", padding: 40 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gap: 24 }}>
        {episodes.map((ep) => {
          const completed = state?.[ep.id as keyof typeof state];
          const isCurrent = currentNode === ep.id;

          return (
            <article
              key={ep.id}
              style={{
                borderRadius: 22,
                padding: 22,
                background: "rgba(0,0,0,0.35)",
                border: isCurrent
                  ? "1px solid rgba(168,85,247,0.85)"
                  : "1px solid rgba(255,255,255,0.14)",
                boxShadow: isCurrent
                  ? "0 0 48px rgba(168,85,247,0.45)"
                  : "none",
                animation: isCurrent ? "pulse 2.8s ease-in-out infinite" : "none",
                opacity: ep.unlocked ? 1 : 0.45,
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

              <p style={{ marginTop: 6, fontSize: 12, opacity: 0.65 }}>
                {completed
                  ? "Committed to memory • written on-chain"
                  : isCurrent
                  ? "System awaiting irreversible input"
                  : "Unavailable — prior state unresolved"}
              </p>

              <button
                disabled={!ep.unlocked}
                onClick={() => setMode(ep.id as Mode)}
                style={{
                  marginTop: 14,
                  borderRadius: 999,
                  padding: "10px 16px",
                  fontWeight: 900,
                  background: ep.unlocked
                    ? "linear-gradient(90deg,#38bdf8,#a855f7)"
                    : "rgba(255,255,255,0.08)",
                  color: ep.unlocked ? "#020617" : "rgba(255,255,255,0.6)",
                  border: "none",
                }}
              >
                {completed ? "Review Memory" : "Enter Episode"}
              </button>
            </article>
          );
        })}

        {archiveUnlocked && (
          <article
            style={{
              marginTop: 32,
              borderRadius: 22,
              padding: 22,
              border: "1px solid rgba(56,189,248,0.6)",
              background: "rgba(0,0,0,0.45)",
            }}
          >
            <h2 style={{ fontWeight: 900 }}>ARCHIVAL ECHO</h2>
            <p style={{ fontSize: 12, opacity: 0.65, marginTop: 6 }}>
              Finalized designation detected. Archive unlocked.
            </p>
            <button
              onClick={() => setMode("archive")}
              style={{
                marginTop: 12,
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 900,
                background: "linear-gradient(90deg,#38bdf8,#a855f7)",
                color: "#020617",
                border: "none",
              }}
            >
              Open Archive
            </button>
          </article>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 14px rgba(168,85,247,0.3); }
          50% { box-shadow: 0 0 48px rgba(168,85,247,0.75); }
          100% { box-shadow: 0 0 14px rgba(168,85,247,0.3); }
        }
      `}</style>
    </main>
  );
}
