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
const MAX_LOG_SCAN = 40_000n;

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

  /* ───────── ENUMERATE BASEBOTS (TS SAFE) ───────── */

  useEffect(() => {
    if (!publicClient || !address || !nftGatePassed) return;
    const client = publicClient; // ✅ TS-safe capture

    let cancelled = false;

    async function loadBots() {
      setTokenListLoading(true);
      setTokenListError(null);
      setOwnedTokenIds([]);
      setSelectedTokenId(null);

      try {
        const latest = await client.getBlockNumber();
        const fromBlock = latest > MAX_LOG_SCAN ? latest - MAX_LOG_SCAN : 0n;

        const logs = await client.getLogs({
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
        setTokenListError("Failed to load Basebots.");
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

  /* ───────── LIVE EVENTS ───────── */

  const lastTokenIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicClient || !selectedTokenId) return;
    const client = publicClient;
    lastTokenIdRef.current = selectedTokenId;

    const unwatch = client.watchContractEvent({
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

  /* ───────── STATE SHAPE ───────── */

  const state = botState
    ? {
        ep1: (botState as any).ep1Set,
        ep2: (botState as any).ep2Set,
        ep3: (botState as any).ep3Set,
        ep4: (botState as any).ep4Set,
        ep5: (botState as any).ep5Set,
      }
    : null;

  const progress = useMemo(() => {
    if (!state) return 0;
    return Math.round(
      ([state.ep1, state.ep2, state.ep3, state.ep4, state.ep5].filter(Boolean).length / 5) * 100
    );
  }, [state]);

  /* ───────── SAFETY ───────── */

  if (!isBase) return <main style={shell()}>Switch to Base</main>;
  if (!address) return <main style={shell()}>Connect wallet</main>;
  if (balanceLoading) return <main style={shell()}>Checking NFT…</main>;
  if (!nftGatePassed) return <main style={shell()}>Basebot NFT required</main>;

  /* ───────── MODE ROUTING ───────── */

  if (mode !== "hub" && selectedTokenId) {
    const props = { tokenId: selectedTokenId, onExit: () => setMode("hub") };
    if (mode === "ep1") return <EpisodeOne {...props} />;
    if (mode === "ep2" && state?.ep1) return <EpisodeTwo {...props} />;
    if (mode === "ep3" && state?.ep2) return <EpisodeThree {...props} />;
    if (mode === "ep4" && state?.ep3) return <EpisodeFour {...props} />;
    if (mode === "ep5" && state?.ep4) return <EpisodeFive {...props} />;
    if (mode === "prologue" && state?.ep1) return <PrologueSilenceInDarkness onExit={props.onExit} />;
    if (mode === "bonus" && state?.ep3) return <BonusEcho onExit={props.onExit} />;
    if (mode === "archive" && state?.ep5) return <BonusEchoArchive onExit={props.onExit} />;
  }

  /* ───────── HUB ───────── */

  return (
    <main style={shell()}>
      <h1>BASEBOTS · Memory Hub</h1>

      <div style={{ display: "flex", gap: 12 }}>
        <select value={selectedTokenId ?? ""} onChange={(e) => setSelectedTokenId(e.target.value)}>
          {ownedTokenIds.map((id) => (
            <option key={id} value={id}>Basebot #{id}</option>
          ))}
        </select>

        <button onClick={() => refetchBotState()} disabled={botLoading}>
          {botLoading ? "Syncing…" : "Sync"}
        </button>
      </div>

      {tokenListError && <div style={{ color: "gold" }}>{tokenListError}</div>}

      <div style={{ marginTop: 20 }}>Progress: {progress}%</div>

      <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
        {[
          ["ep1", "Episode One"],
          ["ep2", "Episode Two"],
          ["ep3", "Episode Three"],
          ["ep4", "Episode Four"],
          ["ep5", "Episode Five"],
        ].map(([k, label]) => (
          <button key={k} onClick={() => setMode(k as Mode)}>
            {label}
          </button>
        ))}
      </div>
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
