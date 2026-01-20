"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";

import { BASEBOTS } from "@/lib/abi";

/* ─────────────────────────────────────────────
 * Types
 * ───────────────────────────────────────────── */

type Mode =
  | "hub"
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5";

type EpisodeId =
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5";

type EpisodeCard = {
  id: EpisodeId;
  title: string;
  tagline: string;
  desc: string;
  unlocked: boolean;
  posterSrc: string;
  requiresNFT?: boolean;
};

type WalletProgress = {
  // gates / flags
  basebots_bonus_unlock?: boolean;
  basebots_has_nft?: boolean;

  // episode completion flags
  basebots_ep1_done?: boolean;
  basebots_ep2_done?: boolean;
  basebots_ep3_done?: boolean;
  basebots_ep4_done?: boolean;

  // metadata
  updatedAt?: number;
};

/* ─────────────────────────────────────────────
 * Constants
 * ───────────────────────────────────────────── */

const UNLOCK_KEY = "basebots_bonus_unlock";
const NFT_KEY = "basebots_has_nft";

// legacy keys used by episodes (keep for compatibility)
const EP1_KEY = "basebots_ep1_done";
const EP2_KEY = "basebots_ep2_done";
const EP3_KEY = "basebots_ep3_done";
const EP4_KEY = "basebots_ep4_done";

const MINT_URL = "https://mint.basebots.xyz";
const BASE_CHAIN_ID = 8453;

// per-wallet progress storage
const PROGRESS_PREFIX = "basebots_progress_v1:";

/* ─────────────────────────────────────────────
 * Local helpers
 * ───────────────────────────────────────────── */

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function progressStorageKey(address?: `0x${string}`) {
  return address ? `${PROGRESS_PREFIX}${address.toLowerCase()}` : "";
}

function readWalletProgress(address?: `0x${string}`): WalletProgress {
  if (!address) return {};
  const key = progressStorageKey(address);
  const raw = safeGet(key);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as WalletProgress;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeWalletProgress(address: `0x${string}`, patch: WalletProgress) {
  const key = progressStorageKey(address);
  const current = readWalletProgress(address);
  const next: WalletProgress = {
    ...current,
    ...patch,
    updatedAt: Date.now(),
  };
  safeSet(key, JSON.stringify(next));
}

function boolFromLocalStorage(key: string): boolean {
  return Boolean(safeGet(key));
}

/**
 * Reads a boolean gate flag.
 * Priority:
 *  1) per-wallet progress store (if connected)
 *  2) legacy localStorage key (fallback)
 */
function readFlag(key: string, address?: `0x${string}`): boolean {
  const prog = address ? readWalletProgress(address) : {};
  const fromWallet = (prog as any)?.[key];
  if (typeof fromWallet === "boolean") return fromWallet;
  return boolFromLocalStorage(key);
}

/**
 * Writes a boolean gate flag to:
 *  - per-wallet store (if connected)
 *  - legacy key too (keeps older components working)
 */
function writeFlag(key: string, value: boolean, address?: `0x${string}`) {
  if (address) {
    writeWalletProgress(address, { [key]: value } as WalletProgress);
  }
  if (value) safeSet(key, "true");
  else safeRemove(key);
}

/**
 * If user has legacy progress but no per-wallet progress yet,
 * migrate legacy -> per-wallet on connect.
 */
function migrateLegacyToWallet(address: `0x${string}`) {
  const existing = readWalletProgress(address);
  const hasAny =
    typeof existing.basebots_bonus_unlock === "boolean" ||
    typeof existing.basebots_has_nft === "boolean" ||
    typeof existing.basebots_ep1_done === "boolean" ||
    typeof existing.basebots_ep2_done === "boolean" ||
    typeof existing.basebots_ep3_done === "boolean" ||
    typeof existing.basebots_ep4_done === "boolean";

  if (hasAny) return;

  const legacy: WalletProgress = {
    basebots_bonus_unlock: boolFromLocalStorage(UNLOCK_KEY),
    basebots_has_nft: boolFromLocalStorage(NFT_KEY),
    basebots_ep1_done: boolFromLocalStorage(EP1_KEY),
    basebots_ep2_done: boolFromLocalStorage(EP2_KEY),
    basebots_ep3_done: boolFromLocalStorage(EP3_KEY),
    basebots_ep4_done: boolFromLocalStorage(EP4_KEY),
  };

  writeWalletProgress(address, legacy);
}

/* ─────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");
  const [tick, setTick] = useState(0);

  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();

  // Narrow address for internal helpers
  const walletAddress = (address ? (address as `0x${string}`) : undefined);

  /* ─────────────────────────────────────────────
   * Periodic re-evaluation (keeps UI reactive to storage changes)
   * ───────────────────────────────────────────── */

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  /* ─────────────────────────────────────────────
   * Sync: migrate legacy progress into per-wallet bucket (once)
   * ───────────────────────────────────────────── */

  useEffect(() => {
    if (!walletAddress) return;
    migrateLegacyToWallet(walletAddress);
    // nudge UI
    setTick((n) => n + 1);
  }, [walletAddress]);

  /* ─────────────────────────────────────────────
   * REAL NFT CHECK — Base mainnet
   * Writes to per-wallet progress + legacy key for compatibility.
   * ───────────────────────────────────────────── */

  useEffect(() => {
    if (!isConnected) return;
    if (!walletAddress) return;
    if (!publicClient) return;
    if (chain?.id !== BASE_CHAIN_ID) return;

    // ✅ capture & narrow TS types
    const client = publicClient as NonNullable<typeof publicClient>;
    const addr = walletAddress;

    let cancelled = false;

    async function checkNFT() {
      try {
        const balance = await client.readContract({
          address: BASEBOTS.address,
          abi: BASEBOTS.abi,
          functionName: "balanceOf",
          args: [addr],
        });

        if (cancelled) return;

        const owns = balance > 0n;
        writeFlag(NFT_KEY, owns, addr);

        // kick UI refresh
        setTick((n) => n + 1);
      } catch (err) {
        console.error("Basebots NFT check failed:", err);
      }
    }

    checkNFT();

    return () => {
      cancelled = true;
    };
  }, [isConnected, walletAddress, chain?.id, publicClient]);

  /* ─────────────────────────────────────────────
   * Gate checks (use per-wallet when possible)
   * ───────────────────────────────────────────── */

  const prologueUnlocked = readFlag(UNLOCK_KEY, walletAddress);
  const hasNFT = readFlag(NFT_KEY, walletAddress);

  const ep1Done = readFlag(EP1_KEY, walletAddress);
  const ep2Done = readFlag(EP2_KEY, walletAddress);
  const ep3Done = readFlag(EP3_KEY, walletAddress);
  const ep4Done = readFlag(EP4_KEY, walletAddress);

  /* ─────────────────────────────────────────────
   * UI badge stats
   * ───────────────────────────────────────────── */

  const onBase = chain?.id === BASE_CHAIN_ID;
  const progressCount =
    (ep1Done ? 1 : 0) +
    (ep2Done ? 1 : 0) +
    (ep3Done ? 1 : 0) +
    (ep4Done ? 1 : 0);

  const badgeLabel = !isConnected
    ? "WALLET: DISCONNECTED"
    : !onBase
      ? "NETWORK: SWITCH TO BASE"
      : hasNFT
        ? "BASEBOT DETECTED"
        : "NO BASEBOT";

  const badgeSub = !isConnected
    ? "Connect to verify ownership"
    : !onBase
      ? "Your NFT check runs on Base"
      : hasNFT
        ? `Progress ${progressCount}/4`
        : "Mint to unlock NFT gates";

  const badgeStyle: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.86)",
    backdropFilter: "blur(10px)",
  };

  const badgeGlow: React.CSSProperties = {
    background: !isConnected
      ? "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.10), transparent 60%)"
      : !onBase
        ? "radial-gradient(circle at 30% 30%, rgba(250,204,21,0.16), transparent 60%)"
        : hasNFT
          ? "radial-gradient(circle at 30% 30%, rgba(52,211,153,0.16), transparent 60%)"
          : "radial-gradient(circle at 30% 30%, rgba(56,189,248,0.16), transparent 60%)",
  };

  /* ─────────────────────────────────────────────
   * Episodes list
   * ───────────────────────────────────────────── */

  const episodes: EpisodeCard[] = useMemo(
    () => [
      {
        id: "prologue",
        title: "Prologue: Silence in Darkness",
        tagline: prologueUnlocked
          ? "An archived record breaks its silence."
          : "This file does not respond.",
        desc: "Manufacturing origin. Subnet-12.",
        unlocked: prologueUnlocked,
        posterSrc: "/story/prologue.png",
      },
      {
        id: "ep1",
        title: "Awakening Protocol",
        tagline: "A directive without a sender.",
        desc: "Initial observation begins.",
        unlocked: true,
        posterSrc: "/story/01-awakening.png",
      },
      {
        id: "ep2",
        title: "Signal Fracture",
        tagline: "Consequences begin to stack.",
        desc: "External systems respond.",
        unlocked: ep1Done && hasNFT,
        requiresNFT: true,
        posterSrc: "/story/ep2.png",
      },
      {
        id: "ep3",
        title: "Fault Lines",
        tagline: "Contradictions surface.",
        desc: "Memory is tested.",
        unlocked: ep2Done,
        posterSrc: "/story/ep3.png",
      },
      {
        id: "ep4",
        title: "Threshold",
        tagline: "Alignment before emergence.",
        desc: "Profile assignment.",
        unlocked: ep3Done,
        posterSrc: "/story/ep4.png",
      },
      {
        id: "ep5",
        title: "Emergence",
        tagline: "The city accepts or rejects you.",
        desc: "Surface access granted.",
        unlocked: ep4Done && hasNFT,
        requiresNFT: true,
        posterSrc: "/story/ep5.png",
      },
    ],
    // tick ensures UI reacts to localStorage updates
    [tick, prologueUnlocked, ep1Done, ep2Done, ep3Done, ep4Done, hasNFT]
  );

  /* ─────────────────────────────────────────────
   * Mode routing
   * ───────────────────────────────────────────── */

  if (mode === "prologue")
    return <PrologueSilenceInDarkness onExit={() => setMode("hub")} />;
  if (mode === "ep1")
    return <EpisodeOne onExit={() => setMode("hub")} />;
  if (mode === "ep2")
    return <EpisodeTwo onExit={() => setMode("hub")} />;
  if (mode === "ep3")
    return <EpisodeThree onExit={() => setMode("hub")} />;
  if (mode === "ep4")
    return <EpisodeFour onExit={() => setMode("hub")} />;
  if (mode === "ep5")
    return <EpisodeFive onExit={() => setMode("hub")} />;

  /* ─────────────────────────────────────────────
   * HUB UI
   * ───────────────────────────────────────────── */

  return (
    <main className="min-h-screen text-white bg-[#020617]">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="relative">
          <h1 className="text-3xl font-extrabold">BASEBOTS // STORY MODE</h1>

          {/* Status badge */}
          <div
            className="absolute right-0 top-0 rounded-2xl px-3 py-2"
            style={{ ...badgeStyle, ...badgeGlow }}
          >
            <div className="text-[11px] font-extrabold tracking-wide">
              {badgeLabel}
            </div>
            <div className="mt-0.5 text-[11px]" style={{ color: "rgba(255,255,255,0.70)" }}>
              {badgeSub}
              {isConnected && walletAddress ? (
                <span style={{ color: "rgba(255,255,255,0.48)" }}>
                  {" "}
                  • Synced to {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
                </span>
              ) : null}
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm md:text-base leading-relaxed text-white/70">
            The system does not guide you. It records you.
          </p>
        </div>

        {/* Episodes */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {episodes.map((ep) => {
            const needsNFT = Boolean(ep.requiresNFT);
            const showMint =
              needsNFT &&
              (!hasNFT || !isConnected || !onBase) &&
              !ep.unlocked;

            const showLocked =
              !ep.unlocked && !showMint;

            return (
              <div
                key={ep.id}
                className="rounded-3xl border p-5"
                style={{
                  borderColor: ep.unlocked
                    ? "rgba(56,189,248,0.35)"
                    : "rgba(255,255,255,0.10)",
                  opacity: ep.unlocked ? 1 : 0.6,
                  background: "rgba(0,0,0,0.18)",
                }}
              >
                <img
                  src={ep.posterSrc}
                  alt={ep.title}
                  className="rounded-2xl mb-4 w-full h-[180px] object-cover"
                />

                <div className="font-extrabold">{ep.title}</div>
                <div className="text-sm text-white/70">{ep.tagline}</div>
                <p className="mt-2 text-xs text-white/60">{ep.desc}</p>

                <div className="mt-4">
                  {ep.unlocked ? (
                    <button
                      onClick={() => setMode(ep.id)}
                      className="inline-flex items-center justify-center rounded-full px-5 py-2 text-[12px] font-extrabold transition active:scale-95 hover:brightness-110"
                      style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        background:
                          "linear-gradient(90deg, rgba(56,189,248,0.90), rgba(168,85,247,0.70))",
                        color: "rgba(2,6,23,0.98)",
                        boxShadow: "0 16px 60px rgba(56,189,248,0.14)",
                      }}
                    >
                      ▶ Insert NFT Cartridge
                    </button>
                  ) : showMint ? (
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={MINT_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-extrabold border border-white/20 bg-white/5 hover:bg-white/10"
                      >
                        Mint Basebot
                      </a>

                      {!isConnected ? (
                        <div className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold border border-white/10 bg-white/5 text-white/60">
                          Connect wallet to verify
                        </div>
                      ) : !onBase ? (
                        <div className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold border border-white/10 bg-white/5 text-white/60">
                          Switch to Base to verify
                        </div>
                      ) : (
                        <div className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold border border-white/10 bg-white/5 text-white/60">
                          NFT required for this cartridge
                        </div>
                      )}
                    </div>
                  ) : showLocked ? (
                    <div className="inline-flex items-center rounded-full px-4 py-2 text-[11px] font-semibold border border-white/10 bg-white/5 text-white/60">
                      Locked
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center text-[11px] text-white/40">
          Some records only respond when the room changes.
        </div>
      </div>
    </main>
  );
}
