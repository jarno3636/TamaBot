"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";

import { BASEBOTS } from "@/lib/abi";

/* ─────────────────────────────────────────────
 * Storage keys
 * ───────────────────────────────────────────── */

const UNLOCK_KEY = "basebots_bonus_unlock";
const BONUS_DONE_KEY = "basebots_bonus_echo_done";
const NFT_KEY = "basebots_has_nft";
const EP1_KEY = "basebots_ep1_done";
const EP2_KEY = "basebots_ep2_done";
const EP3_KEY = "basebots_ep3_done";
const EP4_KEY = "basebots_ep4_done";

const PROGRESS_PREFIX = "basebots_progress_v1:";
const BASE_CHAIN_ID = 8453;

/* ─────────────────────────────────────────────
 * Helpers
 * ───────────────────────────────────────────── */

function safeGet(k: string) {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}

function progressKey(addr?: `0x${string}`) {
  return addr ? `${PROGRESS_PREFIX}${addr.toLowerCase()}` : "";
}

function readWalletProgress(addr?: `0x${string}`) {
  if (!addr) return {};
  try {
    return JSON.parse(safeGet(progressKey(addr)) || "{}");
  } catch {
    return {};
  }
}

function writeWalletProgress(addr: `0x${string}`, patch: any) {
  const cur = readWalletProgress(addr);
  localStorage.setItem(
    progressKey(addr),
    JSON.stringify({ ...cur, ...patch, updatedAt: Date.now() })
  );
}

function migrateLegacy(addr?: `0x${string}`) {
  if (!addr) return;
  writeWalletProgress(addr, {
    basebots_bonus_unlock: Boolean(safeGet(UNLOCK_KEY)),
    basebots_bonus_echo_done: Boolean(safeGet(BONUS_DONE_KEY)),
    basebots_has_nft: Boolean(safeGet(NFT_KEY)),
    basebots_ep1_done: Boolean(safeGet(EP1_KEY)),
    basebots_ep2_done: Boolean(safeGet(EP2_KEY)),
    basebots_ep3_done: Boolean(safeGet(EP3_KEY)),
    basebots_ep4_done: Boolean(safeGet(EP4_KEY)),
  });
}

function readFlag(key: string, addr?: `0x${string}`) {
  const wallet = addr ? readWalletProgress(addr) : {};
  if (typeof wallet[key] === "boolean") return wallet[key];
  return Boolean(safeGet(key));
}

function getStatus(opts: {
  unlocked: boolean;
  done?: boolean;
  requiresNFT?: boolean;
}) {
  if (opts.done) return "COMPLETE";
  if (!opts.unlocked)
    return opts.requiresNFT ? "NFT REQUIRED" : "LOCKED";
  return "AVAILABLE";
}

/* ─────────────────────────────────────────────
 * Component
 * ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<any>("hub");
  const [tick, setTick] = useState(0);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const wallet = address as `0x${string}` | undefined;

  /* sync + migrate */
  useEffect(() => {
    if (wallet) migrateLegacy(wallet);
  }, [wallet, tick]);

  useEffect(() => {
    const h = () => setTick((n) => n + 1);
    window.addEventListener("basebots-progress-updated", h);
    return () => window.removeEventListener("basebots-progress-updated", h);
  }, []);

  /* NFT ownership check */
  useEffect(() => {
    if (!wallet || !publicClient || chain?.id !== BASE_CHAIN_ID) return;
    publicClient
      .readContract({
        address: BASEBOTS.address,
        abi: BASEBOTS.abi,
        functionName: "balanceOf",
        args: [wallet],
      })
      .then((bal) =>
        writeWalletProgress(wallet, { basebots_has_nft: bal > 0n })
      );
  }, [wallet, publicClient, chain?.id]);

  const hasNFT = readFlag(NFT_KEY, wallet);
  const ep1Done = readFlag(EP1_KEY, wallet);
  const ep2Done = readFlag(EP2_KEY, wallet);
  const ep3Done = readFlag(EP3_KEY, wallet);
  const ep4Done = readFlag(EP4_KEY, wallet);
  const prologueUnlocked = readFlag(UNLOCK_KEY, wallet);
  const bonusDone = readFlag(BONUS_DONE_KEY, wallet);

  const episodes = useMemo(
    () => [
      {
        id: "prologue",
        title: "Prologue: Silence in Darkness",
        unlocked: prologueUnlocked,
        done: prologueUnlocked,
        img: "/story/prologue.png",
        note: "An archived signal stirs.",
      },
      {
        id: "ep1",
        title: "Awakening Protocol",
        unlocked: true,
        done: ep1Done,
        img: "/story/01-awakening.png",
        note: "System initialization.",
      },
      {
        id: "ep2",
        title: "Signal Fracture",
        unlocked: ep1Done && hasNFT,
        done: ep2Done,
        img: "/story/ep2.png",
        note: "External interference detected.",
        requiresNFT: true,
      },
      {
        id: "ep3",
        title: "Fault Lines",
        unlocked: ep2Done,
        done: ep3Done,
        img: "/story/ep3.png",
        note: "Cognition destabilizes.",
      },
      {
        id: "ep4",
        title: "Threshold",
        unlocked: ep3Done,
        done: ep4Done,
        img: "/story/ep4.png",
        note: "Alignment before emergence.",
      },
      {
        id: "ep5",
        title: "Emergence",
        unlocked: ep4Done && hasNFT,
        done: false,
        img: "/story/ep5.png",
        note: "Surface access granted.",
        requiresNFT: true,
      },
      {
        id: "bonus",
        title: "Echo: Residual Memory",
        unlocked: prologueUnlocked,
        done: bonusDone,
        img: "/story/b1.png",
        note: "Unindexed fragments recovered.",
        isBonus: true,
      },
    ],
    [
      hasNFT,
      ep1Done,
      ep2Done,
      ep3Done,
      ep4Done,
      bonusDone,
      prologueUnlocked,
    ]
  );

  /* route */
  if (mode !== "hub") {
    const map: any = {
      prologue: <PrologueSilenceInDarkness onExit={() => setMode("hub")} />,
      ep1: <EpisodeOne onExit={() => setMode("hub")} />,
      ep2: <EpisodeTwo onExit={() => setMode("hub")} />,
      ep3: <EpisodeThree onExit={() => setMode("hub")} />,
      ep4: <EpisodeFour onExit={() => setMode("hub")} />,
      ep5: <EpisodeFive onExit={() => setMode("hub")} />,
      bonus: <BonusEcho onExit={() => setMode("hub")} />,
    };
    return map[mode];
  }

  /* HUB UI */
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1200px 600px at 50% -10%, rgba(56,189,248,0.08), transparent 60%), radial-gradient(900px 500px at 90% 120%, rgba(168,85,247,0.10), transparent 60%), #020617",
        color: "white",
        padding: "40px 16px",
      }}
    >
      <header style={{ maxWidth: 1200, margin: "0 auto 32px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>
          BASEBOTS // STORY MODE
        </h1>
        <p style={{ opacity: 0.7 }}>
          This system records interpretation, not obedience.
        </p>
      </header>

      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 24,
        }}
      >
        {episodes.map((ep) => {
          const status = getStatus(ep);
          const locked = !ep.unlocked;

          const badgeColor =
            status === "COMPLETE"
              ? "rgba(34,197,94,0.9)"
              : status === "AVAILABLE"
              ? "rgba(56,189,248,0.9)"
              : status === "NFT REQUIRED"
              ? "rgba(168,85,247,0.9)"
              : "rgba(255,255,255,0.4)";

          return (
            <article
              key={ep.id}
              style={{
                borderRadius: 24,
                overflow: "hidden",
                background: "rgba(0,0,0,0.35)",
                border: locked
                  ? "1px solid rgba(255,255,255,0.12)"
                  : "1px solid rgba(56,189,248,0.35)",
                opacity: locked ? 0.55 : 1,
              }}
            >
              <img
                src={ep.img}
                style={{
                  width: "100%",
                  height: 220,
                  objectFit: "cover",
                  filter: locked
                    ? "grayscale(0.6) brightness(0.75)"
                    : "none",
                }}
              />

              <div style={{ padding: 20 }}>
                <div
                  style={{
                    display: "inline-block",
                    padding: "4px 10px",
                    borderRadius: 999,
                    background: badgeColor,
                    color: "#020617",
                    fontSize: 10,
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  {status}
                </div>

                <h2 style={{ fontWeight: 800 }}>{ep.title}</h2>
                <p style={{ fontSize: 12, opacity: 0.7 }}>
                  {ep.note}
                </p>

                <button
                  disabled={locked}
                  onClick={() => setMode(ep.id)}
                  style={{
                    marginTop: 14,
                    width: "100%",
                    borderRadius: 999,
                    padding: "10px",
                    fontSize: 12,
                    fontWeight: 800,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: locked
                      ? "rgba(255,255,255,0.06)"
                      : "linear-gradient(90deg, rgba(56,189,248,0.95), rgba(168,85,247,0.85))",
                    color: locked ? "rgba(255,255,255,0.6)" : "#020617",
                    cursor: locked ? "not-allowed" : "pointer",
                  }}
                >
                  {locked
                    ? status
                    : ep.isBonus
                    ? "▶ Read Echo"
                    : "▶ Insert NFT Cartridge"}
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <footer
        style={{
          marginTop: 40,
          textAlign: "center",
          fontSize: 11,
          opacity: 0.5,
        }}
      >
        Some records only respond when acknowledged.
      </footer>
    </main>
  );
}
