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
  const [mode, setMode] = useState<Mode>("hub");

  // multiple bots
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

  /* ───────── ENUMERATE BASEBOTS (TRANSFER LOG SCAN) ───────── */

  useEffect(() => {
    if (!publicClient || !address || !nftGatePassed) return;

    const client = publicClient; // ✅ TS-safe capture
    const ownerAddress = address; // ✅ TS-safe capture

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

        const owner = getAddress(ownerAddress);
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

        if (list.length === 0) {
          setTokenListError(
            "No bots found in the recent scan window. If your Basebot transfers are older than the scan range, increase MAX_LOG_SCAN or use an indexer/subgraph."
          );
        }
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

  /* ───────── BOT STATE (selected tokenId only) ───────── */

  const {
    data: botState,
    refetch: refetchBotState,
    isLoading: botLoading,
  } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: selectedTokenId ? [BigInt(selectedTokenId)] : undefined,
    query: { enabled: Boolean(selectedTokenId && nftGatePassed) },
  });

  /* ───────── LIVE EVENT UPDATES ───────── */

  const lastTokenIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicClient || !selectedTokenId) return;
    const client = publicClient;
    lastTokenIdRef.current = selectedTokenId;

    const unwatch = client.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        const watching = lastTokenIdRef.current;
        if (!watching) return;

        for (const log of logs as any[]) {
          const tid = log.args?.tokenId?.toString();
          if (tid && tid === watching) {
            refetchBotState();
            break;
          }
        }
      },
    });

    return () => unwatch();
  }, [publicClient, selectedTokenId, refetchBotState]);

  /* ───────── BOT STATE SHAPE ───────── */

  const state = useMemo(() => {
    if (!botState) return null;
    const s: any = botState as any;
    return {
      ep1: Boolean(s.ep1Set),
      ep2: Boolean(s.ep2Set),
      ep3: Boolean(s.ep3Set),
      ep4: Boolean(s.ep4Set),
      ep5: Boolean(s.ep5Set),
      finalized: Boolean(s.finalized),
      updatedAt: Number(s.updatedAt ?? 0),
      finalizedAt: Number(s.finalizedAt ?? 0),
    };
  }, [botState]);

  /* ───────── UNLOCK LOGIC ───────── */

  const ep1Unlocked = nftGatePassed;
  const ep2Unlocked = nftGatePassed && Boolean(state?.ep1);
  const ep3Unlocked = nftGatePassed && Boolean(state?.ep2);
  const ep4Unlocked = nftGatePassed && Boolean(state?.ep3);
  const ep5Unlocked = nftGatePassed && Boolean(state?.ep4);

  const prologueUnlocked = Boolean(state?.ep1);
  const bonusUnlocked = Boolean(state?.ep3);
  const archiveUnlocked = Boolean(state?.ep5);

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
    if (!selectedTokenId) {
      return (
        <main style={shell()}>
          No Basebot selected.
          <br />
          {tokenListLoading ? "Loading your Basebots…" : "Refresh or reconnect your wallet."}
        </main>
      );
    }

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
      default:
        return null;
    }
  }

  /* ───────── HUB UI DATA ───────── */

  const episodes: Array<{
    key: EpisodeKey;
    title: string;
    teaser: string;
    img: string;
    unlocked: boolean;
    completed: boolean;
    cta: string;
    hint: string;
  }> = [
    {
      key: "prologue",
      title: "Prologue — Silence in Darkness",
      teaser:
        "A dormant subsystem pings once… then again. The room between systems remembers your footsteps, but not your name.",
      img: "/story/01-awakening.webp",
      unlocked: prologueUnlocked,
      completed: false,
      cta: "Watch the signal",
      hint: "Unlocks after Episode One begins.",
    },
    {
      key: "ep1",
      title: "Episode One — The Handshake",
      teaser:
        "A contract offer appears on cold glass. Accept it and you wake the machine. Refuse it and you wake something else.",
      img: "/story/02-handshake.webp",
      unlocked: ep1Unlocked,
      completed: Boolean(state?.ep1),
      cta: "Enter Episode One",
      hint: "NFT gated.",
    },
    {
      key: "ep2",
      title: "Episode Two — The Recall",
      teaser:
        "A memory fragment leaks into the network. Someone tries to erase it. You can chase the truth or chase the cover-up.",
      img: "/story/03-recall.webp",
      unlocked: ep2Unlocked,
      completed: Boolean(state?.ep2),
      cta: "Continue to Episode Two",
      hint: "Unlocks after Ep.1 is set on-chain.",
    },
    {
      key: "ep3",
      title: "Episode Three — The Watcher",
      teaser:
        "A presence in the logs watches you watching it. Every choice produces a new shadow in the audit trail.",
      img: "/story/04-watcher.webp",
      unlocked: ep3Unlocked,
      completed: Boolean(state?.ep3),
      cta: "Continue to Episode Three",
      hint: "Unlocks after Ep.2 is set on-chain.",
    },
    {
      key: "ep4",
      title: "Episode Four — Drift Protocol",
      teaser:
        "The city lights flicker like dying stars. A protocol activates. Your bot learns what it was built to forget.",
      img: "/story/05-drift.webp",
      unlocked: ep4Unlocked,
      completed: Boolean(state?.ep4),
      cta: "Continue to Episode Four",
      hint: "Unlocks after Ep.3 is set on-chain.",
    },
    {
      key: "ep5",
      title: "Episode Five — Final Commit",
      teaser:
        "One last merge. One last decision. The chain will remember the outcome even if you don’t.",
      img: "/story/06-final-commit.webp",
      unlocked: ep5Unlocked,
      completed: Boolean(state?.ep5),
      cta: "Enter the Finale",
      hint: "Unlocks after Ep.4 is set on-chain.",
    },
    {
      key: "bonus",
      title: "Bonus — Echo",
      teaser:
        "A residual packet drifts in from an old block. It contains a voiceprint you weren’t meant to hear.",
      img: "/story/07-echo.webp",
      unlocked: bonusUnlocked,
      completed: false,
      cta: "Open Bonus",
      hint: "Unlocks after Ep.3.",
    },
    {
      key: "archive",
      title: "Archive — Echo (Classified)",
      teaser:
        "Read-only. What happened is recorded here, but some lines are blacked out. You’ll feel them anyway.",
      img: "/story/08-archive.webp",
      unlocked: archiveUnlocked,
      completed: false,
      cta: "Open Archive",
      hint: "Unlocks after Ep.5.",
    },
  ];

  /* ───────── HUB ───────── */

  return (
    <main style={shell()}>
      {/* Inline keyframes / utility CSS */}
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.03); opacity: 1; }
          100% { transform: scale(1); opacity: 0.85; }
        }
        @keyframes scanMove {
          0% { transform: translateY(-30%); opacity: 0; }
          20% { opacity: 0.18; }
          80% { opacity: 0.18; }
          100% { transform: translateY(130%); opacity: 0; }
        }
      `}</style>

      {/* Top hero */}
      <div style={heroWrap()}>
        <div style={heroBg()} aria-hidden />
        <div style={heroScan()} aria-hidden />
        <div style={heroInner()}>
          <div style={kickerRow()}>
            <div style={kickerPill()}>BASEBOTS</div>
            <div style={kickerDot()} />
            <div style={{ opacity: 0.85, fontSize: 13 }}>On-chain story progression</div>
          </div>

          <h1 style={heroTitle()}>Memory Hub</h1>
          <p style={heroSub()}>
            Choose a Basebot you own. Progress is read from (and written to) the Season 2 state contract. Every episode unlock
            is on-chain — no Farcaster ID, no off-chain saves.
          </p>

          <div style={heroControls()}>
            <div style={selectBlock()}>
              <div style={label()}>Active Basebot</div>

              <div style={selectRow()}>
                <select
                  value={selectedTokenId ?? ""}
                  onChange={(e) => setSelectedTokenId(e.target.value || null)}
                  style={select()}
                  disabled={tokenListLoading || ownedTokenIds.length === 0}
                >
                  {ownedTokenIds.length === 0 ? (
                    <option value="">
                      {tokenListLoading ? "Loading…" : "No bots found"}
                    </option>
                  ) : (
                    ownedTokenIds.map((tid) => (
                      <option key={tid} value={tid}>
                        Basebot #{tid}
                      </option>
                    ))
                  )}
                </select>

                <button
                  onClick={() => refetchBotState()}
                  style={ghostBtn()}
                  disabled={!selectedTokenId || botLoading}
                  title="Refresh on-chain state"
                >
                  {botLoading ? "Syncing…" : "Sync"}
                </button>
              </div>

              {tokenListError ? <div style={tinyWarn()}>{tokenListError}</div> : null}
              {!tokenListError && tokenListLoading ? (
                <div style={tinyMuted()}>Scanning recent Transfer logs…</div>
              ) : null}
            </div>

            <div style={progressBlock()}>
              <div style={label()}>Progress</div>
              <div style={progressRow()}>
                <div style={progressBarOuter()}>
                  <div style={progressBarInner(progress)} />
                </div>
                <div style={progressPct()}>{selectedTokenId ? `${progress}%` : "—"}</div>
              </div>
              <div style={tinyMuted()}>
                {selectedTokenId ? `Tracking Basebot #${selectedTokenId}` : "Select a Basebot to track"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Episode grid */}
      <div style={gridWrap()}>
        {episodes.map((ep) => {
          const locked = !ep.unlocked;
          const ready = ep.unlocked && !ep.completed;
          const complete = Boolean(ep.completed);

          const badgeText = complete ? "Complete" : ready ? "Ready" : "Locked";
          const badgeKind: "complete" | "ready" | "locked" = complete ? "complete" : ready ? "ready" : "locked";

          const needsToken =
            ep.key === "ep1" || ep.key === "ep2" || ep.key === "ep3" || ep.key === "ep4" || ep.key === "ep5";

          const canEnter = ep.unlocked && (!needsToken || Boolean(selectedTokenId));

          const onEnter = () => {
            if (!canEnter) return;
            setMode(ep.key as Mode);
          };

          return (
            <div key={ep.key} style={card(locked)}>
              <div style={thumbWrap()}>
                <div
                  style={{
                    ...thumbImg(ep.img),
                    filter: locked ? "grayscale(0.7) brightness(0.7)" : "none",
                  }}
                />
                <div style={thumbOverlay()} />
                <div style={thumbTopRow()}>
                  <div
                    style={{
                      ...statusBadge(badgeKind),
                      animation: ready ? "pulseGlow 1.25s ease-in-out infinite" : "none",
                    }}
                  >
                    {badgeText}
                  </div>
                  <div style={miniTag()}>{ep.key.toUpperCase()}</div>
                </div>
              </div>

              <div style={cardBody()}>
                <div style={cardTitleRow()}>
                  <div style={cardTitle()}>{ep.title}</div>
                </div>

                <div style={cardTeaser()}>{ep.teaser}</div>

                <div style={cardHint()}>{ep.hint}</div>

                <div style={cardActions()}>
                  <button
                    onClick={onEnter}
                    disabled={!canEnter}
                    style={primaryBtn(!canEnter)}
                    title={
                      !selectedTokenId && needsToken
                        ? "Select a Basebot to enter episodes."
                        : locked
                        ? "Locked"
                        : "Enter"
                    }
                  >
                    {ep.cta}
                  </button>

                  {needsToken ? (
                    <div style={chipRow()}>
                      <div style={chip()}>
                        <span style={{ opacity: 0.8 }}>On-chain:</span>{" "}
                        <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                          EpisodeSet
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={footer()}>
        <div style={tinyMuted()}>
          Tip: If your progress looks stale, hit <b>Sync</b> — it refetches bot state from the contract. Episode unlocks are
          derived from <b>getBotState(tokenId)</b>.
        </div>
      </div>
    </main>
  );
}

/* ───────── styles (inline helpers) ───────── */

const shell = () => ({
  minHeight: "100vh",
  background: "#020617",
  color: "white",
  padding: "28px 18px 48px",
});

const heroWrap = () => ({
  position: "relative" as const,
  maxWidth: 1120,
  margin: "0 auto",
  borderRadius: 26,
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
  background:
    "radial-gradient(1200px 380px at 10% 0%, rgba(56,189,248,0.18), rgba(2,6,23,0) 60%), radial-gradient(900px 420px at 90% 20%, rgba(168,85,247,0.12), rgba(2,6,23,0) 55%), rgba(0,0,0,0.35)",
  boxShadow: "0 40px 120px rgba(0,0,0,0.75)",
});

const heroBg = () => ({
  position: "absolute" as const,
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0)), radial-gradient(700px 260px at 40% 0%, rgba(34,211,238,0.16), rgba(2,6,23,0) 60%)",
  pointerEvents: "none" as const,
});

const heroScan = () => ({
  position: "absolute" as const,
  left: 0,
  right: 0,
  top: 0,
  height: "40%",
  background: "linear-gradient(180deg, rgba(34,211,238,0), rgba(34,211,238,0.10), rgba(34,211,238,0))",
  animation: "scanMove 3.2s linear infinite",
  pointerEvents: "none" as const,
  mixBlendMode: "screen" as const,
});

const heroInner = () => ({
  position: "relative" as const,
  padding: "26px 18px",
});

const kickerRow = () => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 10,
});

const kickerPill = () => ({
  fontSize: 12,
  letterSpacing: 1.2,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(2,6,23,0.55)",
});

const kickerDot = () => ({
  width: 6,
  height: 6,
  borderRadius: 999,
  background: "rgba(34,211,238,0.85)",
  boxShadow: "0 0 18px rgba(34,211,238,0.6)",
});

const heroTitle = () => ({
  margin: "8px 0 8px",
  fontSize: 34,
  lineHeight: 1.05,
  letterSpacing: -0.5,
});

const heroSub = () => ({
  margin: 0,
  opacity: 0.85,
  maxWidth: 860,
  fontSize: 14,
  lineHeight: 1.6,
});

const heroControls = () => ({
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "1fr",
  gap: 14,
});

const selectBlock = () => ({
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(2,6,23,0.55)",
  padding: 14,
});

const progressBlock = () => ({
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(2,6,23,0.55)",
  padding: 14,
});

const label = () => ({
  fontSize: 12,
  opacity: 0.75,
  marginBottom: 8,
});

const selectRow = () => ({
  display: "flex",
  gap: 10,
  alignItems: "center",
});

const select = () => ({
  flex: 1,
  height: 42,
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.35)",
  color: "white",
  padding: "0 12px",
  outline: "none",
  fontSize: 14,
});

const ghostBtn = () => ({
  height: 42,
  padding: "0 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.06)",
  color: "white",
  cursor: "pointer",
  fontSize: 13,
});

const tinyWarn = () => ({
  marginTop: 10,
  fontSize: 12,
  opacity: 0.8,
  color: "rgba(253,224,71,0.95)",
});

const tinyMuted = () => ({
  marginTop: 8,
  fontSize: 12,
  opacity: 0.75,
});

const progressRow = () => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
});

const progressBarOuter = () => ({
  flex: 1,
  height: 10,
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.10)",
  overflow: "hidden",
});

const progressBarInner = (pct: number) => ({
  width: `${Math.max(0, Math.min(100, pct))}%`,
  height: "100%",
  borderRadius: 999,
  background: "linear-gradient(90deg, rgba(34,211,238,0.95), rgba(168,85,247,0.85))",
  boxShadow: "0 0 24px rgba(34,211,238,0.25)",
});

const progressPct = () => ({
  width: 54,
  textAlign: "right" as const,
  fontSize: 12,
  opacity: 0.85,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
});

const gridWrap = () => ({
  maxWidth: 1120,
  margin: "16px auto 0",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: 14,
});

const card = (locked: boolean) => ({
  borderRadius: 22,
  border: "1px solid rgba(255,255,255,0.10)",
  background: locked ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.35)",
  overflow: "hidden",
  boxShadow: locked ? "none" : "0 24px 70px rgba(0,0,0,0.55)",
  opacity: locked ? 0.82 : 1,
});

const thumbWrap = () => ({
  position: "relative" as const,
  height: 150,
  overflow: "hidden",
});

const thumbImg = (url: string) => ({
  position: "absolute" as const,
  inset: 0,
  backgroundImage: `url(${url})`,
  backgroundSize: "cover",
  backgroundPosition: "center",
  transform: "scale(1.02)",
});

const thumbOverlay = () => ({
  position: "absolute" as const,
  inset: 0,
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.15), rgba(2,6,23,0.85)), radial-gradient(500px 140px at 30% 0%, rgba(34,211,238,0.14), rgba(2,6,23,0) 70%)",
});

const thumbTopRow = () => ({
  position: "absolute" as const,
  top: 12,
  left: 12,
  right: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 10,
});

const statusBadge = (kind: "complete" | "ready" | "locked") => {
  const base = {
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid rgba(255,255,255,0.14)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  } as any;

  if (kind === "complete") {
    return {
      ...base,
      background: "rgba(34,211,238,0.14)",
      color: "rgba(224,255,255,0.95)",
      boxShadow: "0 0 22px rgba(34,211,238,0.22)",
    };
  }
  if (kind === "ready") {
    return {
      ...base,
      background: "rgba(168,85,247,0.14)",
      color: "rgba(245,235,255,0.95)",
      boxShadow: "0 0 22px rgba(168,85,247,0.20)",
    };
  }
  return {
    ...base,
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.85)",
  };
};

const miniTag = () => ({
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,6,23,0.55)",
  opacity: 0.9,
});

const cardBody = () => ({
  padding: "14px 14px 16px",
});

const cardTitleRow = () => ({
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
});

const cardTitle = () => ({
  fontSize: 15,
  lineHeight: 1.25,
  letterSpacing: -0.2,
});

const cardTeaser = () => ({
  marginTop: 8,
  fontSize: 13,
  lineHeight: 1.55,
  opacity: 0.82,
  minHeight: 62,
});

const cardHint = () => ({
  marginTop: 10,
  fontSize: 12,
  opacity: 0.7,
});

const cardActions = () => ({
  marginTop: 12,
  display: "flex",
  flexDirection: "column" as const,
  gap: 10,
});

const primaryBtn = (disabled: boolean) => ({
  height: 44,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.14)",
  background: disabled
    ? "rgba(255,255,255,0.06)"
    : "linear-gradient(135deg, rgba(34,211,238,0.22), rgba(168,85,247,0.18))",
  color: "white",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
  fontSize: 13,
  fontWeight: 600,
  letterSpacing: 0.2,
  boxShadow: disabled ? "none" : "0 18px 45px rgba(0,0,0,0.55)",
});

const chipRow = () => ({
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
});

const chip = () => ({
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  fontSize: 12,
  opacity: 0.85,
});

const footer = () => ({
  maxWidth: 1120,
  margin: "18px auto 0",
  padding: "12px 2px",
  opacity: 0.9,
});
