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

/* keys */
const UNLOCK_KEY = "basebots_bonus_unlock";
const NFT_KEY = "basebots_has_nft";
const EP1_KEY = "basebots_ep1_done";
const EP2_KEY = "basebots_ep2_done";
const EP3_KEY = "basebots_ep3_done";
const EP4_KEY = "basebots_ep4_done";

const PROGRESS_PREFIX = "basebots_progress_v1:";
const BASE_CHAIN_ID = 8453;

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

export default function StoryPage() {
  const [mode, setMode] = useState<any>("hub");
  const [tick, setTick] = useState(0);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const wallet = address as `0x${string}` | undefined;

  useEffect(() => {
    if (wallet) migrateLegacy(wallet);
  }, [wallet, tick]);

  useEffect(() => {
    const h = () => setTick((n) => n + 1);
    window.addEventListener("basebots-progress-updated", h);
    return () => window.removeEventListener("basebots-progress-updated", h);
  }, []);

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

  const episodes = useMemo(
    () => [
      {
        id: "prologue",
        title: "Prologue: Silence in Darkness",
        unlocked: prologueUnlocked,
        img: "/story/prologue.png",
      },
      {
        id: "ep1",
        title: "Awakening Protocol",
        unlocked: true,
        img: "/story/01-awakening.png",
      },
      {
        id: "ep2",
        title: "Signal Fracture",
        unlocked: ep1Done && hasNFT,
        img: "/story/ep2.png",
      },
      {
        id: "ep3",
        title: "Fault Lines",
        unlocked: ep2Done,
        img: "/story/ep3.png",
      },
      {
        id: "ep4",
        title: "Threshold",
        unlocked: ep3Done,
        img: "/story/ep4.png",
      },
      {
        id: "ep5",
        title: "Emergence",
        unlocked: ep4Done && hasNFT,
        img: "/story/ep5.png",
      },
    ],
    [hasNFT, ep1Done, ep2Done, ep3Done, ep4Done, prologueUnlocked]
  );

  if (mode !== "hub") {
    const map: any = {
      prologue: <PrologueSilenceInDarkness onExit={() => setMode("hub")} />,
      ep1: <EpisodeOne onExit={() => setMode("hub")} />,
      ep2: <EpisodeTwo onExit={() => setMode("hub")} />,
      ep3: <EpisodeThree onExit={() => setMode("hub")} />,
      ep4: <EpisodeFour onExit={() => setMode("hub")} />,
      ep5: <EpisodeFive onExit={() => setMode("hub")} />,
    };
    return map[mode];
  }

  return (
    <main className="min-h-screen bg-[#020617] text-white">
      <div className="container mx-auto px-4 py-10 grid gap-6 md:grid-cols-2">
        {episodes.map((ep) => (
          <div
            key={ep.id}
            className="rounded-3xl overflow-hidden border"
            style={{
              borderColor: ep.unlocked
                ? "rgba(56,189,248,0.35)"
                : "rgba(255,255,255,0.10)",
              opacity: ep.unlocked ? 1 : 0.5,
            }}
          >
            <img src={ep.img} className="h-[220px] w-full object-cover" />
            <div className="p-5">
              <div className="font-extrabold">{ep.title}</div>
              <button
                disabled={!ep.unlocked}
                onClick={() => setMode(ep.id)}
                className="mt-3 rounded-full px-4 py-2 text-xs font-extrabold"
              >
                {ep.unlocked ? "Continue" : "Locked"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
