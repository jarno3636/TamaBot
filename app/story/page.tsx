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

// Concurrency tuning: 12–25 is usually safe on Base RPCs.
// If you ever see rate-limit errors, drop this to 10–12.
const OWNER_OF_CONCURRENCY = 18;

// Safety cap (avoid freezing the UI if totalMinted unexpectedly huge)
const HARD_MAX_SCAN = 5000;

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

type BotStateShape = {
  ep1: boolean;
  ep2: boolean;
  ep3: boolean;
  ep4: boolean;
  ep5: boolean;
  finalized?: boolean;
};

type EpisodeCard = {
  key: EpisodeKey;
  title: string;
  teaser: string;
  img: string;
  unlocked: boolean;
  completed: boolean;
  cta: string;
  hint: string;
  needsToken: boolean;
};

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Concurrency pool for async tasks
 */
async function parallelMapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, idx: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
  signal?: { cancelled: () => boolean }
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  let done = 0;

  const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
    while (true) {
      const idx = nextIndex++;
      if (idx >= items.length) return;
      if (signal?.cancelled()) return;

      try {
        results[idx] = await mapper(items[idx], idx);
      } catch (e) {
        // still record as undefined-ish (mapper should handle if it wants)
        throw e;
      } finally {
        done++;
        onProgress?.(done, items.length);
      }
    }
  });

  await Promise.all(workers);
  return results;
}

export default function StoryPage() {
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const isBase = chain?.id === BASE_CHAIN_ID;

  const [mode, setMode] = useState<Mode>("hub");

  // Owned Basebots
  const [ownedTokenIds, setOwnedTokenIds] = useState<string[]>([]);
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);

  // Loading / errors
  const [loadingBots, setLoadingBots] = useState(false);
  const [botError, setBotError] = useState<string | null>(null);

  // Progress while scanning
  const [scanPct, setScanPct] = useState<number>(0);

  /* ──────────────────────────────────────────────
   * NFT Gate
   * ────────────────────────────────────────────── */

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    ...BASEBOTS,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && isBase) },
  });

  const nftGatePassed = typeof balance === "bigint" && balance > 0n;

  /* ──────────────────────────────────────────────
   * Enumerate ownership: totalMinted + ownerOf (parallel)
   * ────────────────────────────────────────────── */

  useEffect(() => {
    if (!publicClient || !address || !nftGatePassed) return;

    const client = publicClient; // ✅ TS-safe capture
    const ownerLower = address.toLowerCase();

    let cancelledFlag = false;
    const cancelled = () => cancelledFlag;

    async function loadBots() {
      setLoadingBots(true);
      setBotError(null);
      setOwnedTokenIds([]);
      setSelectedTokenId(null);
      setScanPct(0);

      try {
        // 1) Read totalMinted
        const totalMinted = (await client.readContract({
          address: BASEBOTS.address,
          abi: BASEBOTS.abi,
          functionName: "totalMinted",
        })) as bigint;

        let max = Number(totalMinted);

        if (!Number.isFinite(max) || max < 0) max = 0;
        if (max > HARD_MAX_SCAN) {
          // Don’t silently hammer RPCs
          setBotError(
            `Supply is ${max}. This UI caps scans at ${HARD_MAX_SCAN} for safety. Increase HARD_MAX_SCAN (or add an indexer) if needed.`
          );
          max = HARD_MAX_SCAN;
        }

        if (max === 0) {
          setBotError("No Basebots minted yet (totalMinted = 0).");
          return;
        }

        // 2) Build token ids 1..max (common for 721s)
        const tokenIds = Array.from({ length: max }, (_, i) => i + 1);

        // 3) Parallel ownerOf with concurrency pool
        // If your contract’s tokenIds start at 0 instead of 1, change i+1 to i.
        const owned: number[] = [];
        setScanPct(1);

        // A mapper that returns tokenOwner lowercased or null (for non-existent)
        const owners = await parallelMapPool(
          tokenIds,
          OWNER_OF_CONCURRENCY,
          async (tokenId) => {
            if (cancelled()) return null as any;

            try {
              const tokenOwner = (await client.readContract({
                address: BASEBOTS.address,
                abi: BASEBOTS.abi,
                functionName: "ownerOf",
                args: [BigInt(tokenId)],
              })) as `0x${string}`;

              return tokenOwner?.toLowerCase?.() ?? null;
            } catch {
              // Nonexistent tokenId or reverted read: treat as not minted / ignore
              return null;
            }
          },
          (done, total) => {
            const pct = Math.round((done / total) * 100);
            setScanPct(pct);
          },
          { cancelled }
        );

        if (cancelled()) return;

        for (let i = 0; i < owners.length; i++) {
          if (owners[i] === ownerLower) owned.push(tokenIds[i]);
        }

        owned.sort((a, b) => a - b);
        const ownedStr = owned.map(String);

        setOwnedTokenIds(ownedStr);
        setSelectedTokenId(ownedStr[0] ?? null);

        if (ownedStr.length === 0) {
          setBotError("This wallet doesn’t own any Basebots.");
        }
      } catch (err: any) {
        console.error(err);
        setBotError("Failed to resolve Basebot ownership (RPC read failed).");
      } finally {
        if (!cancelled()) setLoadingBots(false);
      }
    }

    loadBots();

    return () => {
      cancelledFlag = true;
    };
  }, [publicClient, address, nftGatePassed]);

  /* ──────────────────────────────────────────────
   * Bot State (Season 2 contract)
   * ────────────────────────────────────────────── */

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

  const state: BotStateShape | null = useMemo(() => {
    if (!botState) return null;
    const s: any = botState;
    return {
      ep1: Boolean(s.ep1Set),
      ep2: Boolean(s.ep2Set),
      ep3: Boolean(s.ep3Set),
      ep4: Boolean(s.ep4Set),
      ep5: Boolean(s.ep5Set),
      finalized: Boolean(s.finalized),
    };
  }, [botState]);

  /* ──────────────────────────────────────────────
   * Live Updates: EpisodeSet
   * ────────────────────────────────────────────── */

  const activeTokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!publicClient || !selectedTokenId) return;
    const client = publicClient;
    activeTokenRef.current = selectedTokenId;

    const unwatch = client.watchContractEvent({
      ...BASEBOTS_S2,
      eventName: "EpisodeSet",
      onLogs: (logs) => {
        const watching = activeTokenRef.current;
        if (!watching) return;

        for (const log of logs as any[]) {
          if (log.args?.tokenId?.toString?.() === watching) {
            refetchBotState();
            break;
          }
        }
      },
    });

    return () => unwatch();
  }, [publicClient, selectedTokenId, refetchBotState]);

  /* ──────────────────────────────────────────────
   * Unlock logic + progress
   * ────────────────────────────────────────────── */

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

  /* ──────────────────────────────────────────────
   * Gate / safety UI
   * ────────────────────────────────────────────── */

  if (!isBase) return <main style={shell()}>Switch to Base network.</main>;
  if (!address) return <main style={shell()}>Connect wallet to continue.</main>;
  if (balanceLoading) return <main style={shell()}>Checking NFT ownership…</main>;
  if (!nftGatePassed) return <main style={shell()}>Basebot NFT required.</main>;

  /* ──────────────────────────────────────────────
   * Mode routing
   * ────────────────────────────────────────────── */

  if (mode !== "hub") {
    const exit = () => setMode("hub");
    if (!selectedTokenId) return <main style={shell()}>Select a Basebot first.</main>;

    switch (mode) {
      case "ep1":
        return <EpisodeOne tokenId={selectedTokenId} onExit={exit} />;
      case "ep2":
        return ep2Unlocked ? <EpisodeTwo tokenId={selectedTokenId} onExit={exit} /> : <main style={shell()}>Locked.</main>;
      case "ep3":
        return ep3Unlocked ? <EpisodeThree tokenId={selectedTokenId} onExit={exit} /> : <main style={shell()}>Locked.</main>;
      case "ep4":
        return ep4Unlocked ? <EpisodeFour tokenId={selectedTokenId} onExit={exit} /> : <main style={shell()}>Locked.</main>;
      case "ep5":
        return ep5Unlocked ? <EpisodeFive tokenId={selectedTokenId} onExit={exit} /> : <main style={shell()}>Locked.</main>;
      case "prologue":
        return prologueUnlocked ? <PrologueSilenceInDarkness onExit={exit} /> : <main style={shell()}>Locked.</main>;
      case "bonus":
        return bonusUnlocked ? <BonusEcho onExit={exit} /> : <main style={shell()}>Locked.</main>;
      case "archive":
        return archiveUnlocked ? <BonusEchoArchive onExit={exit} /> : <main style={shell()}>Locked.</main>;
      default:
        return <main style={shell()}>Unknown route.</main>;
    }
  }

  /* ──────────────────────────────────────────────
   * Episode cards (with thumbs + badges)
   * ────────────────────────────────────────────── */

  const episodes: EpisodeCard[] = [
    {
      key: "prologue",
      title: "Prologue — Silence in Darkness",
      teaser:
        "A dormant subsystem pings once… then again. The room between systems remembers your footsteps, but not your name.",
      img: "/story/01-awakening.webp",
      unlocked: prologueUnlocked,
      completed: false,
      cta: "Open Prologue",
      hint: "Unlocks after Episode One begins.",
      needsToken: false,
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
      needsToken: true,
    },
    {
      key: "ep2",
      title: "Episode Two — The Recall",
      teaser:
        "A memory fragment leaks into the network. Someone tries to erase it. You can chase the truth or chase the cover-up.",
      img: "/story/03-recall.webp",
      unlocked: ep2Unlocked,
      completed: Boolean(state?.ep2),
      cta: "Continue Episode Two",
      hint: "Unlocks after Ep.1 is set on-chain.",
      needsToken: true,
    },
    {
      key: "ep3",
      title: "Episode Three — The Watcher",
      teaser:
        "A presence in the logs watches you watching it. Every choice produces a new shadow in the audit trail.",
      img: "/story/04-watcher.webp",
      unlocked: ep3Unlocked,
      completed: Boolean(state?.ep3),
      cta: "Continue Episode Three",
      hint: "Unlocks after Ep.2 is set on-chain.",
      needsToken: true,
    },
    {
      key: "ep4",
      title: "Episode Four — Drift Protocol",
      teaser:
        "The city lights flicker like dying stars. A protocol activates. Your bot learns what it was built to forget.",
      img: "/story/05-drift.webp",
      unlocked: ep4Unlocked,
      completed: Boolean(state?.ep4),
      cta: "Continue Episode Four",
      hint: "Unlocks after Ep.3 is set on-chain.",
      needsToken: true,
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
      needsToken: true,
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
      needsToken: false,
    },
    {
      key: "archive",
      title: "Archive — Classified",
      teaser:
        "Read-only. What happened is recorded here, but some lines are blacked out. You’ll feel them anyway.",
      img: "/story/08-archive.webp",
      unlocked: archiveUnlocked,
      completed: false,
      cta: "Open Archive",
      hint: "Unlocks after Ep.5.",
      needsToken: false,
    },
  ];

  return (
    <main style={shell()}>
      <style>{`
        :root { color-scheme: dark; }
        @keyframes pulseGlow {
          0% { transform: scale(1); opacity: 0.88; }
          50% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 0.88; }
        }
        @keyframes scanMove {
          0% { transform: translateY(-30%); opacity: 0; }
          20% { opacity: 0.18; }
          80% { opacity: 0.18; }
          100% { transform: translateY(130%); opacity: 0; }
        }
      `}</style>

      {/* HERO */}
      <div style={heroWrap()} role="region" aria-label="Memory Hub">
        <div style={heroBg()} aria-hidden />
        <div style={heroScan()} aria-hidden />
        <div style={heroInner()}>
          <div style={kickerRow()}>
            <div style={kickerPill()}>BASEBOTS</div>
            <div style={kickerDot()} aria-hidden />
            <div style={{ opacity: 0.85, fontSize: 13 }}>On-chain story progression</div>
          </div>

          <h1 style={heroTitle()}>Memory Hub</h1>
          <p style={heroSub()}>
            Choose a Basebot you own. Progress is read from (and written to) the Season 2 state contract.
            Every unlock is on-chain — no Farcaster ID, no off-chain saves.
          </p>

          <div style={heroControls()}>
            <div style={panel()}>
              <div style={label()}>Active Basebot</div>

              <div style={selectRow()}>
                <select
                  value={selectedTokenId ?? ""}
                  onChange={(e) => setSelectedTokenId(e.target.value || null)}
                  style={selectStyle()}
                  disabled={loadingBots || ownedTokenIds.length === 0}
                  aria-label="Select Basebot token"
                >
                  {ownedTokenIds.length === 0 ? (
                    <option value="">
                      {loadingBots ? `Scanning chain… ${scanPct}%` : "No bots found"}
                    </option>
                  ) : (
                    ownedTokenIds.map((id) => (
                      <option key={id} value={id}>
                        Basebot #{id}
                      </option>
                    ))
                  )}
                </select>

                <button
                  onClick={() => refetchBotState()}
                  style={ghostBtn()}
                  disabled={!selectedTokenId || botLoading}
                  aria-label="Sync bot state"
                >
                  {botLoading ? "Syncing…" : "Sync"}
                </button>
              </div>

              {loadingBots ? (
                <div style={tinyMuted()} aria-live="polite">
                  Resolving ownership via <b>totalMinted</b> + <b>ownerOf</b>… {scanPct}%
                </div>
              ) : null}

              {botError ? (
                <div style={tinyWarn()} role="status" aria-live="polite">
                  {botError}
                </div>
              ) : null}
            </div>

            <div style={panel()}>
              <div style={label()}>Progress</div>

              <div style={progressRow()}>
                <div style={progressBarOuter()} aria-hidden>
                  <div style={progressBarInner(progress)} />
                </div>
                <div style={progressPct()} aria-label={`Progress ${progress}%`}>
                  {selectedTokenId ? `${progress}%` : "—"}
                </div>
              </div>

              <div style={tinyMuted()}>
                {selectedTokenId ? `Tracking Basebot #${selectedTokenId}` : "Select a Basebot to track"}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EPISODES GRID */}
      <div style={gridWrap()} role="list" aria-label="Episodes">
        {episodes.map((ep) => {
          const locked = !ep.unlocked;
          const complete = ep.completed;
          const ready = ep.unlocked && !ep.completed;

          const badgeText = complete ? "Complete" : ready ? "Ready" : "Locked";
          const badgeKind: "complete" | "ready" | "locked" = complete ? "complete" : ready ? "ready" : "locked";

          const canEnter = ep.unlocked && (!ep.needsToken || Boolean(selectedTokenId));

          const onEnter = () => {
            if (!canEnter) return;
            setMode(ep.key as Mode);
          };

          return (
            <div key={ep.key} style={card(locked)} role="listitem">
              <div style={thumbWrap()}>
                <div
                  style={{
                    ...thumbImg(ep.img),
                    filter: locked ? "grayscale(0.8) brightness(0.65)" : "none",
                  }}
                  aria-hidden
                />
                <div style={thumbOverlay()} aria-hidden />

                <div style={thumbTopRow()}>
                  <div
                    style={{
                      ...statusBadge(badgeKind),
                      animation: ready ? "pulseGlow 1.25s ease-in-out infinite" : "none",
                    }}
                    aria-label={`Status: ${badgeText}`}
                  >
                    {badgeText}
                  </div>

                  <div style={miniTag()} aria-hidden>
                    {ep.key.toUpperCase()}
                  </div>
                </div>
              </div>

              <div style={cardBody()}>
                <div style={cardTitle()}>{ep.title}</div>

                <div style={cardTeaser()}>{ep.teaser}</div>

                <div style={cardHint()}>
                  {ep.hint}
                  {ep.needsToken ? (
                    <>
                      {" "}
                      <span style={{ opacity: 0.85 }}>
                        (Uses <span style={{ fontFamily: "ui-monospace, Menlo, monospace" }}>EpisodeSet</span>)
                      </span>
                    </>
                  ) : null}
                </div>

                <div style={cardActions()}>
                  <button
                    onClick={onEnter}
                    disabled={!canEnter}
                    style={primaryBtn(!canEnter)}
                    aria-disabled={!canEnter}
                    aria-label={canEnter ? ep.cta : `${ep.cta} (locked)`}
                    title={
                      !selectedTokenId && ep.needsToken
                        ? "Select a Basebot to enter episodes."
                        : locked
                        ? "Locked"
                        : "Enter"
                    }
                  >
                    {ep.cta}
                  </button>

                  <div style={metaRow()}>
                    <div style={metaChip()}>
                      <span style={{ opacity: 0.75 }}>Access:</span>{" "}
                      <b>{ep.unlocked ? "Unlocked" : "Locked"}</b>
                    </div>
                    <div style={metaChip()}>
                      <span style={{ opacity: 0.75 }}>Basebot:</span>{" "}
                      <b>{ep.needsToken ? (selectedTokenId ? `#${selectedTokenId}` : "Select one") : "Not required"}</b>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER */}
      <div style={footer()}>
        <div style={tinyMuted()}>
          Tip: if progress looks stale, hit <b>Sync</b>. Unlocks come from <b>getBotState(tokenId)</b>.
        </div>
      </div>
    </main>
  );
}

/* ──────────────────────────────────────────────
 * Styles (inline helpers)
 * ────────────────────────────────────────────── */

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

const panel = () => ({
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

const selectStyle = () => ({
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
  opacity: 0.9,
  color: "rgba(253,224,71,0.95)",
});

const tinyMuted = () => ({
  marginTop: 8,
  fontSize: 12,
  opacity: 0.78,
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
  opacity: 0.88,
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
  opacity: locked ? 0.85 : 1,
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
    "linear-gradient(180deg, rgba(2,6,23,0.15), rgba(2,6,23,0.86)), radial-gradient(500px 140px at 30% 0%, rgba(34,211,238,0.14), rgba(2,6,23,0) 70%)",
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
  } as const;

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
    color: "rgba(255,255,255,0.88)",
  };
};

const miniTag = () => ({
  padding: "6px 10px",
  borderRadius: 999,
  fontSize: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(2,6,23,0.55)",
  opacity: 0.92,
});

const cardBody = () => ({
  padding: "14px 14px 16px",
});

const cardTitle = () => ({
  fontSize: 15,
  lineHeight: 1.25,
  letterSpacing: -0.2,
  fontWeight: 650 as any,
});

const cardTeaser = () => ({
  marginTop: 8,
  fontSize: 13,
  lineHeight: 1.55,
  opacity: 0.84,
  minHeight: 62,
});

const cardHint = () => ({
  marginTop: 10,
  fontSize: 12,
  opacity: 0.72,
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
  fontWeight: 700 as any,
  letterSpacing: 0.2,
  boxShadow: disabled ? "none" : "0 18px 45px rgba(0,0,0,0.55)",
});

const metaRow = () => ({
  display: "flex",
  gap: 8,
  flexWrap: "wrap" as const,
});

const metaChip = () => ({
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.05)",
  fontSize: 12,
  opacity: 0.88,
});

const footer = () => ({
  maxWidth: 1120,
  margin: "18px auto 0",
  padding: "12px 2px",
  opacity: 0.95,
});
