"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";

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

type EpisodeKey =
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5"
  | "bonus"
  | "archive";

export default function StoryPage() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const isBase = chain?.id === BASE_CHAIN_ID;

  const [mode, setMode] = useState<Mode>("hub");

  // NFT ownership
  const [ownedTokenIds, setOwnedTokenIds] = useState<string[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [loadingBots, setLoadingBots] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);

  /* ───────── NFT GATE ───────── */

  const { data: balance } = useReadContract({
    ...BASEBOTS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isBase) },
  });

  const nftGatePassed = typeof balance === "bigint" && balance > 0n;

  /* ───────── OWNERSHIP ENUMERATION (CORRECT METHOD) ───────── */

  useEffect(() => {
    if (!publicClient || !address || !nftGatePassed) return;

    let cancelled = false;
    const owner = address.toLowerCase();

    async function loadBots() {
      setLoadingBots(true);
      setBotError(null);
      setOwnedTokenIds([]);
      setSelectedTokenId(null);

      try {
        const totalMinted = await publicClient.readContract({
          address: BASEBOTS.address,
          abi: BASEBOTS.abi,
          functionName: "totalMinted",
        });

        const max = Number(totalMinted);
        const owned: string[] = [];

        for (let tokenId = 1; tokenId <= max; tokenId++) {
          if (cancelled) return;

          try {
            const tokenOwner = await publicClient.readContract({
              address: BASEBOTS.address,
              abi: BASEBOTS.abi,
              functionName: "ownerOf",
              args: [BigInt(tokenId)],
            });

            if (tokenOwner.toLowerCase() === owner) {
              owned.push(tokenId.toString());
            }
          } catch {
            // token not minted yet — ignore
          }
        }

        if (cancelled) return;

        owned.sort((a, b) => Number(a) - Number(b));
        setOwnedTokenIds(owned);
        setSelectedTokenId(owned[0] ?? null);

        if (owned.length === 0) {
          setBotError("No Basebots owned by this wallet.");
        }
      } catch (err) {
        console.error(err);
        setBotError("Failed to resolve Basebot ownership.");
      } finally {
        if (!cancelled) setLoadingBots(false);
      }
    }

    loadBots();
    return () => {
      cancelled = true;
    };
  }, [publicClient, address, nftGatePassed]);

  /* ───────── BOT STATE ───────── */

  const { data: botState, refetch: refetchBotState } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: selectedTokenId ? [BigInt(selectedTokenId)] : undefined,
    query: { enabled: Boolean(selectedTokenId) },
  });

  const state = useMemo(() => {
    if (!botState) return null;
    const s: any = botState;
    return {
      ep1: Boolean(s.ep1Set),
      ep2: Boolean(s.ep2Set),
      ep3: Boolean(s.ep3Set),
      ep4: Boolean(s.ep4Set),
      ep5: Boolean(s.ep5Set),
    };
  }, [botState]);

  /* ───────── LIVE UPDATES ───────── */

  const activeTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicClient || !selectedTokenId) return;
    activeTokenRef.current = selectedTokenId;

    const unwatch = publicClient.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        for (const log of logs as any[]) {
          if (log.args?.tokenId?.toString() === activeTokenRef.current) {
            refetchBotState();
            break;
          }
        }
      },
    });

    return () => unwatch();
  }, [publicClient, selectedTokenId, refetchBotState]);

  /* ───────── UNLOCKS ───────── */

  const ep1Unlocked = nftGatePassed;
  const ep2Unlocked = state?.ep1;
  const ep3Unlocked = state?.ep2;
  const ep4Unlocked = state?.ep3;
  const ep5Unlocked = state?.ep4;

  const prologueUnlocked = state?.ep1;
  const bonusUnlocked = state?.ep3;
  const archiveUnlocked = state?.ep5;

  /* ───────── ROUTING ───────── */

  if (!isBase) return <main style={shell()}>Switch to Base network.</main>;
  if (!address) return <main style={shell()}>Connect wallet.</main>;
  if (!nftGatePassed) return <main style={shell()}>Basebot NFT required.</main>;

  if (mode !== "hub") {
    if (!selectedTokenId) return <main style={shell()}>Select a Basebot.</main>;

    const exit = () => setMode("hub");

    switch (mode) {
      case "ep1":
        return <EpisodeOne tokenId={selectedTokenId} onExit={exit} />;
      case "ep2":
        return ep2Unlocked ? <EpisodeTwo tokenId={selectedTokenId} onExit={exit} /> : null;
      case "ep3":
        return ep3Unlocked ? <EpisodeThree tokenId={selectedTokenId} onExit={exit} /> : null;
      case "ep4":
        return ep4Unlocked ? <EpisodeFour tokenId={selectedTokenId} onExit={exit} /> : null;
      case "ep5":
        return ep5Unlocked ? <EpisodeFive tokenId={selectedTokenId} onExit={exit} /> : null;
      case "prologue":
        return prologueUnlocked ? <PrologueSilenceInDarkness onExit={exit} /> : null;
      case "bonus":
        return bonusUnlocked ? <BonusEcho onExit={exit} /> : null;
      case "archive":
        return archiveUnlocked ? <BonusEchoArchive onExit={exit} /> : null;
      default:
        return null;
    }
  }

  /* ───────── HUB UI ───────── */

  return (
    <main style={shell()}>
      <h1 style={{ fontSize: 34 }}>Memory Hub</h1>

      <p style={{ opacity: 0.85, maxWidth: 720 }}>
        Choose a Basebot you own. All progress is read from and written to the Season 2
        state contract. No Farcaster. No off-chain saves.
      </p>

      <div style={{ marginTop: 20, maxWidth: 420 }}>
        <select
          value={selectedTokenId ?? ""}
          onChange={(e) => setSelectedTokenId(e.target.value || null)}
          style={select()}
          disabled={loadingBots}
        >
          {ownedTokenIds.length === 0 ? (
            <option value="">
              {loadingBots ? "Scanning chain…" : "No bots found"}
            </option>
          ) : (
            ownedTokenIds.map((id) => (
              <option key={id} value={id}>
                Basebot #{id}
              </option>
            ))
          )}
        </select>

        {botError && <div style={{ marginTop: 8, color: "#fde047" }}>{botError}</div>}
      </div>

      <div style={{ marginTop: 30 }}>
        <button onClick={() => setMode("ep1")} disabled={!ep1Unlocked}>
          Enter Episode One
        </button>
        <button onClick={() => setMode("ep2")} disabled={!ep2Unlocked}>
          Episode Two
        </button>
        <button onClick={() => setMode("ep3")} disabled={!ep3Unlocked}>
          Episode Three
        </button>
        <button onClick={() => setMode("ep4")} disabled={!ep4Unlocked}>
          Episode Four
        </button>
        <button onClick={() => setMode("ep5")} disabled={!ep5Unlocked}>
          Episode Five
        </button>
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

const select = () => ({
  width: "100%",
  height: 42,
  borderRadius: 12,
  background: "rgba(0,0,0,0.4)",
  border: "1px solid rgba(255,255,255,0.15)",
  color: "white",
  padding: "0 12px",
});
