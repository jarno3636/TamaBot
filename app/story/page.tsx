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

type Mode = "hub" | "prologue" | "ep1" | "ep2" | "ep3" | "ep4" | "ep5";

type EpisodeId = Mode;

type EpisodeCard = {
  id: EpisodeId;
  act: string;
  title: string;
  desc: string;
  unlocked: boolean;
  posterSrc: string;
  requiresNFT?: boolean;
};

/* ─────────────────────────────────────────────
 * Keys
 * ───────────────────────────────────────────── */

const UNLOCK_KEY = "basebots_bonus_unlock";
const NFT_KEY = "basebots_has_nft";

const EP1_KEY = "basebots_ep1_done";
const EP2_KEY = "basebots_ep2_done";
const EP3_KEY = "basebots_ep3_done";
const EP4_KEY = "basebots_ep4_done";

const PROGRESS_PREFIX = "basebots_progress_v1:";
const BASE_CHAIN_ID = 8453;
const MINT_URL = "https://mint.basebots.xyz";

/* ─────────────────────────────────────────────
 * Storage helpers
 * ───────────────────────────────────────────── */

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function safeSet(k: string, v: string) {
  try {
    localStorage.setItem(k, v);
  } catch {}
}

function progressKey(addr?: `0x${string}`) {
  return addr ? `${PROGRESS_PREFIX}${addr.toLowerCase()}` : "";
}

function readWalletProgress(addr?: `0x${string}`): any {
  if (!addr) return {};
  const raw = safeGet(progressKey(addr));
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeWalletProgress(addr: `0x${string}`, patch: any) {
  const key = progressKey(addr);
  const current = readWalletProgress(addr);
  safeSet(key, JSON.stringify({ ...current, ...patch, updatedAt: Date.now() }));
}

/**
 * 🔧 CRITICAL FIX:
 * Always migrate legacy → wallet BEFORE reading gates
 */
function migrateLegacy(addr?: `0x${string}`) {
  if (!addr) return;
  const cur = readWalletProgress(addr);

  writeWalletProgress(addr, {
    basebots_bonus_unlock: cur.basebots_bonus_unlock ?? Boolean(safeGet(UNLOCK_KEY)),
    basebots_has_nft: cur.basebots_has_nft ?? Boolean(safeGet(NFT_KEY)),
    basebots_ep1_done: cur.basebots_ep1_done ?? Boolean(safeGet(EP1_KEY)),
    basebots_ep2_done: cur.basebots_ep2_done ?? Boolean(safeGet(EP2_KEY)),
    basebots_ep3_done: cur.basebots_ep3_done ?? Boolean(safeGet(EP3_KEY)),
    basebots_ep4_done: cur.basebots_ep4_done ?? Boolean(safeGet(EP4_KEY)),
  });
}

function readFlag(key: string, addr?: `0x${string}`) {
  const wallet = addr ? readWalletProgress(addr) : {};
  if (typeof wallet[key] === "boolean") return wallet[key];
  return Boolean(safeGet(key));
}

/* ─────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");
  const [tick, setTick] = useState(0);

  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();
  const wallet = address as `0x${string}` | undefined;

  /* 🔄 keep reactive */
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 400);
    return () => clearInterval(t);
  }, []);

  /* 🔁 migrate legacy every mount */
  useEffect(() => {
    if (wallet) migrateLegacy(wallet);
  }, [wallet]);

  /* 🔎 NFT check */
  useEffect(() => {
    if (!wallet || !publicClient || chain?.id !== BASE_CHAIN_ID) return;

    (async () => {
      const bal = await publicClient.readContract({
        address: BASEBOTS.address,
        abi: BASEBOTS.abi,
        functionName: "balanceOf",
        args: [wallet],
      });

      writeWalletProgress(wallet, { basebots_has_nft: bal > 0n });
      setTick((n) => n + 1);
    })();
  }, [wallet, publicClient, chain?.id]);

  /* Gates */
  const hasNFT = readFlag(NFT_KEY, wallet);
  const ep1Done = readFlag(EP1_KEY, wallet);
  const ep2Done = readFlag(EP2_KEY, wallet);
  const ep3Done = readFlag(EP3_KEY, wallet);
  const ep4Done = readFlag(EP4_KEY, wallet);
  const prologueUnlocked = readFlag(UNLOCK_KEY, wallet);

  /* Episodes */
  const episodes: EpisodeCard[] = useMemo(
    () => [
      {
        id: "prologue",
        act: "ARCHIVE",
        title: "Silence in Darkness",
        desc: "Manufacturing origin. Subnet-12.",
        unlocked: prologueUnlocked,
        posterSrc: "/story/prologue.png",
      },
      {
        id: "ep1",
        act: "ACT I",
        title: "Awakening Protocol",
        desc: "Initial observation begins.",
        unlocked: true,
        posterSrc: "/story/01-awakening.png",
      },
      {
        id: "ep2",
        act: "ACT I",
        title: "Signal Fracture",
        desc: "Identity pressure escalates.",
        unlocked: ep1Done && hasNFT,
        requiresNFT: true,
        posterSrc: "/story/ep2.png",
      },
      {
        id: "ep3",
        act: "ACT II",
        title: "Fault Lines",
        desc: "Contradictions surface.",
        unlocked: ep2Done,
        posterSrc: "/story/ep3.png",
      },
      {
        id: "ep4",
        act: "ACT II",
        title: "Threshold",
        desc: "Alignment before emergence.",
        unlocked: ep3Done,
        posterSrc: "/story/ep4.png",
      },
      {
        id: "ep5",
        act: "ACT III",
        title: "Emergence",
        desc: "The city responds.",
        unlocked: ep4Done && hasNFT,
        requiresNFT: true,
        posterSrc: "/story/ep5.png",
      },
    ],
    [tick, hasNFT, ep1Done, ep2Done, ep3Done, ep4Done, prologueUnlocked]
  );

  /* Routing */
  if (mode === "prologue") return <PrologueSilenceInDarkness onExit={() => setMode("hub")} />;
  if (mode === "ep1") return <EpisodeOne onExit={() => setMode("hub")} />;
  if (mode === "ep2") return <EpisodeTwo onExit={() => setMode("hub")} />;
  if (mode === "ep3") return <EpisodeThree onExit={() => setMode("hub")} />;
  if (mode === "ep4") return <EpisodeFour onExit={() => setMode("hub")} />;
  if (mode === "ep5") return <EpisodeFive onExit={() => setMode("hub")} />;

  /* HUB */
  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="container mx-auto px-4 py-10">
        <h1 className="text-3xl font-extrabold mb-6">BASEBOTS — STORY</h1>

        <div className="grid gap-4 md:grid-cols-2">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="rounded-3xl border p-4"
              style={{
                borderColor: ep.unlocked ? "rgba(56,189,248,0.35)" : "rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.25)",
                opacity: ep.unlocked ? 1 : 0.55,
              }}
            >
              <div className="text-[11px] text-white/50 font-semibold">{ep.act}</div>
              <div className="font-extrabold text-lg">{ep.title}</div>
              <p className="text-sm text-white/60">{ep.desc}</p>

              <button
                disabled={!ep.unlocked}
                onClick={() => setMode(ep.id)}
                className="mt-4 rounded-full px-4 py-2 text-xs font-extrabold"
                style={{
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: ep.unlocked
                    ? "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.7))"
                    : "rgba(255,255,255,0.05)",
                  color: ep.unlocked ? "rgba(2,6,23,0.95)" : "rgba(255,255,255,0.5)",
                }}
              >
                {ep.unlocked ? "Continue" : ep.requiresNFT ? "NFT Required" : "Locked"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
