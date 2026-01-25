"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { getAddress } from "viem";

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
const MAX_LOG_SCAN = 40_000n; // safe for Base RPCs

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

  const [ownedTokenIds, setOwnedTokenIds] = useState<string[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [tokenListLoading, setTokenListLoading] = useState(false);
  const [tokenListError, setTokenListError] = useState<string | null>(null);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const isBase = chain?.id === BASE_CHAIN_ID;

  /* ───────── NFT GATE ───────── */

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    ...BASEBOTS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isBase) },
  });

  const nftGatePassed = typeof balance === "bigint" && balance > 0n;

  /* ───────── ENUMERATE BASEBOTS (TRANSFER LOGS) ───────── */

  useEffect(() => {
    if (!publicClient || !address || !nftGatePassed) return;

    let cancelled = false;

    async function loadBots() {
      setTokenListLoading(true);
      setTokenListError(null);
      setOwnedTokenIds([]);
      setSelectedTokenId(null);

      try {
        const latest = await publicClient.getBlockNumber();
        const fromBlock = latest > MAX_LOG_SCAN ? latest - MAX_LOG_SCAN : 0n;

        const logs = await publicClient.getLogs({
          address: BASEBOTS.address,
          event: {
            type: "event",
            name: "Transfer",
            inputs: [
              { indexed: true, name: "from", type: "address" },
              { indexed: true, name: "to", type: "address" },
              { indexed: true, name: "tokenId", type: "uint256" },
            ],
          },
          fromBlock,
          toBlock: latest,
        });

        if (cancelled) return;

        const owner = getAddress(address);
        const owned = new Set<string>();

        for (const log of logs as any[]) {
          const { from, to, tokenId } = log.args;
          const id = tokenId.toString();

          if (getAddress(to) === owner) owned.add(id);
          if (getAddress(from) === owner) owned.delete(id);
        }

        const list = [...owned].sort((a, b) => Number(a) - Number(b));
        setOwnedTokenIds(list);
        setSelectedTokenId(list[0] ?? null);
      } catch (err) {
        console.error(err);
        setTokenListError("Failed to load Basebots from chain history.");
      } finally {
        if (!cancelled) setTokenListLoading(false);
      }
    }

    loadBots();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, nftGatePassed]);

  /* ───────── BOT STATE ───────── */

  const { data: botState, refetch: refetchBotState, isLoading: botLoading } =
    useReadContract({
      ...BASEBOTS_S2,
      functionName: "getBotState",
      args: selectedTokenId ? [BigInt(selectedTokenId)] : undefined,
      query: { enabled: Boolean(selectedTokenId) },
    });

  /* ───────── LIVE EVENT UPDATES ───────── */

  const lastTokenIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicClient || !selectedTokenId) return;
    lastTokenIdRef.current = selectedTokenId;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        for (const log of logs as any[]) {
          if (log.args?.tokenId?.toString() === lastTokenIdRef.current) {
            refetchBotState();
            break;
          }
        }
      },
    });

    return () => unwatch();
  }, [publicClient, selectedTokenId, refetchBotState]);

  /* ───────── BOT STATE SHAPE ───────── */

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
  const ep2Unlocked = state?.ep1;
  const ep3Unlocked = state?.ep2;
  const ep4Unlocked = state?.ep3;
  const ep5Unlocked = state?.ep4;

  const prologueUnlocked = state?.ep1;
  const bonusUnlocked = state?.ep3;
  const archiveUnlocked = state?.ep5;

  const progress = useMemo(() => {
    if (!state) return 0;
    const done = [state.ep1, state.ep2, state.ep3, state.ep4, state.ep5].filter(Boolean).length;
    return Math.round((done / 5) * 100);
  }, [state]);

  /* ───────── SAFETY UI ───────── */

  if (!isBase) return <main style={shell()}>Switch to Base network.</main>;
  if (!address) return <main style={shell()}>Connect wallet to continue.</main>;
  if (balanceLoading) return <main style={shell()}>Checking NFT ownership…</main>;
  if (!nftGatePassed) return <main style={shell()}>Basebot NFT required.</main>;

  /* ───────── MODE ROUTING ───────── */

  if (mode !== "hub") {
    if (!selectedTokenId) return <main style={shell()}>No Basebot selected.</main>;

    switch (mode) {
      case "ep1":
        return <EpisodeOne tokenId={selectedTokenId} onExit={() => setMode("hub")} />;
      case "ep2":
        return ep2Unlocked ? <EpisodeTwo tokenId={selectedTokenId} onExit={() => setMode("hub")} /> : null;
      case "ep3":
        return ep3Unlocked ? <EpisodeThree tokenId={selectedTokenId} onExit={() => setMode("hub")} /> : null;
      case "ep4":
        return ep4Unlocked ? <EpisodeFour tokenId={selectedTokenId} onExit={() => setMode("hub")} /> : null;
      case "ep5":
        return ep5Unlocked ? <EpisodeFive tokenId={selectedTokenId} onExit={() => setMode("hub")} /> : null;
      case "prologue":
        return prologueUnlocked ? <PrologueSilenceInDarkness onExit={() => setMode("hub")} /> : null;
      case "bonus":
        return bonusUnlocked ? <BonusEcho onExit={() => setMode("hub")} /> : null;
      case "archive":
        return archiveUnlocked ? <BonusEchoArchive onExit={() => setMode("hub")} /> : null;
    }
  }

  /* ───────── EPISODE DATA (IMAGES) ───────── */

  const episodes = [
    { key: "prologue", title: "Prologue — Silence in Darkness", img: "/story/01-awakening.webp", unlocked: prologueUnlocked },
    { key: "ep1", title: "Episode One — The Handshake", img: "/story/02-handshake.webp", unlocked: ep1Unlocked },
    { key: "ep2", title: "Episode Two — The Recall", img: "/story/03-recall.webp", unlocked: ep2Unlocked },
    { key: "ep3", title: "Episode Three — The Watcher", img: "/story/04-watcher.webp", unlocked: ep3Unlocked },
    { key: "ep4", title: "Episode Four — Drift Protocol", img: "/story/05-drift.webp", unlocked: ep4Unlocked },
    { key: "ep5", title: "Episode Five — Final Commit", img: "/story/06-final-commit.webp", unlocked: ep5Unlocked },
    { key: "bonus", title: "Bonus — Echo", img: "/story/07-echo.webp", unlocked: bonusUnlocked },
    { key: "archive", title: "Archive — Classified", img: "/story/08-archive.webp", unlocked: archiveUnlocked },
  ];

  /* ───────── HUB UI ───────── */

  return (
    <main style={shell()}>
      <h1>Memory Hub</h1>

      <div>
        <select value={selectedTokenId ?? ""} onChange={(e) => setSelectedTokenId(e.target.value || null)}>
          {ownedTokenIds.map((id) => (
            <option key={id} value={id}>Basebot #{id}</option>
          ))}
        </select>

        <button onClick={() => refetchBotState()} disabled={botLoading}>
          {botLoading ? "Syncing…" : "Sync"}
        </button>

        {tokenListError && <div style={{ color: "gold" }}>{tokenListError}</div>}
      </div>

      <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
        {episodes.map((ep) => (
          <button key={ep.key} disabled={!ep.unlocked} onClick={() => setMode(ep.key as Mode)}>
            {ep.title}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>Progress: {progress}%</div>
    </main>
  );
}

/* ───────── styles ───────── */

const shell = () => ({
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: 32,
});
