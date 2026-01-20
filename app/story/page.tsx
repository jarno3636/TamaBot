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

/* ───────────────────────────────────────────── */

const UNLOCK_KEY = "basebots_bonus_unlock";
const NFT_KEY = "basebots_has_nft";
const MINT_URL = "https://mint.basebots.xyz";

function has(key: string) {
  try {
    return Boolean(localStorage.getItem(key));
  } catch {
    return false;
  }
}

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");
  const [tick, setTick] = useState(0);

  const { address, isConnected, chain } = useAccount();
  const publicClient = usePublicClient();

  /* ─────────────────────────────────────────────
   * Periodic re-evaluation
   * ───────────────────────────────────────────── */

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, []);

  /* ─────────────────────────────────────────────
   * REAL NFT CHECK — TS + wagmi SAFE
   * ───────────────────────────────────────────── */

  useEffect(() => {
    if (!isConnected) return;
    if (!address) return;
    if (!publicClient) return;
    if (chain?.id !== 8453) return;

    // ✅ CAPTURE AND NARROW TYPES
    const client = publicClient as NonNullable<typeof publicClient>;
    const walletAddress = address as `0x${string}`;

    let cancelled = false;

    async function checkNFT() {
      try {
        const balance = await client.readContract({
          address: BASEBOTS.address,
          abi: BASEBOTS.abi,
          functionName: "balanceOf",
          args: [walletAddress],
        });

        if (cancelled) return;

        if (balance > 0n) {
          localStorage.setItem(NFT_KEY, "true");
        } else {
          localStorage.removeItem(NFT_KEY);
        }
      } catch (err) {
        console.error("Basebots NFT check failed:", err);
      }
    }

    checkNFT();

    return () => {
      cancelled = true;
    };
  }, [address, isConnected, chain?.id, publicClient]);

  /* ─────────────────────────────────────────────
   * Gate checks
   * ───────────────────────────────────────────── */

  const prologueUnlocked = has(UNLOCK_KEY);
  const hasNFT = has(NFT_KEY);

  const ep1Done = has("basebots_ep1_done");
  const ep2Done = has("basebots_ep2_done");
  const ep3Done = has("basebots_ep3_done");
  const ep4Done = has("basebots_ep4_done");

  /* ───────────────────────────────────────────── */

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
    [tick, hasNFT, ep1Done, ep2Done, ep3Done, ep4Done, prologueUnlocked]
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
        <h1 className="text-3xl font-extrabold">BASEBOTS // STORY MODE</h1>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {episodes.map((ep) => (
            <div
              key={ep.id}
              className="rounded-3xl border p-5"
              style={{
                borderColor: ep.unlocked
                  ? "rgba(56,189,248,0.35)"
                  : "rgba(255,255,255,0.10)",
                opacity: ep.unlocked ? 1 : 0.6,
              }}
            >
              <img
                src={ep.posterSrc}
                alt={ep.title}
                className="rounded-2xl mb-4 w-full h-[180px] object-cover"
              />

              <div className="font-extrabold">{ep.title}</div>
              <div className="text-sm text-white/70">{ep.tagline}</div>

              <div className="mt-4">
                {ep.unlocked ? (
                  <button
                    onClick={() => setMode(ep.id)}
                    className="rounded-full px-4 py-2 text-xs font-extrabold bg-sky-400 text-black"
                  >
                    ▶ Enter
                  </button>
                ) : ep.requiresNFT ? (
                  <a
                    href={MINT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full px-4 py-2 text-xs font-extrabold border border-white/20"
                  >
                    Mint Basebot to Continue
                  </a>
                ) : (
                  <div className="text-xs text-white/50">Locked</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
