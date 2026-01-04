"use client";

import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { createPublicClient, http, zeroAddress } from "viem";
import { base } from "viem/chains";
import { usePublicClient } from "wagmi";
import { BASEBOTS } from "@/lib/abi";

const ERC721_TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: true, name: "tokenId", type: "uint256" },
  ],
} as const;

const ERC721_TOKENURI_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

type MintCard = {
  tokenId: bigint;
  svg: string | null;
};

function getErrText(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;
  if (typeof e === "object") {
    const anyE = e as any;
    if (typeof anyE.shortMessage === "string" && anyE.shortMessage) return anyE.shortMessage;
    if (typeof anyE.message === "string" && anyE.message) return anyE.message;
    if (anyE.cause && typeof anyE.cause.message === "string" && anyE.cause.message) return anyE.cause.message;
  }
  try {
    return String(e);
  } catch {
    return "Unknown error";
  }
}

function safeAtob(b64: string): string {
  try {
    return atob(b64);
  } catch {
    return "";
  }
}

function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri) return null;

  if (tokenUri.startsWith("data:application/json;base64,")) {
    const b64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = safeAtob(b64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      if (typeof meta?.image_data === "string" && meta.image_data.trim().startsWith("<svg")) {
        return meta.image_data;
      }

      if (typeof meta?.image === "string") {
        const img: string = meta.image;

        if (img.startsWith("data:image/svg+xml;base64,")) {
          const svgB64 = img.slice("data:image/svg+xml;base64,".length);
          const svg = safeAtob(svgB64);
          return svg?.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg?.includes("<svg") ? svg : null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  if (tokenUri.trim().startsWith("{")) {
    try {
      const meta = JSON.parse(tokenUri);
      if (typeof meta?.image_data === "string" && meta.image_data.trim().startsWith("<svg")) return meta.image_data;
      if (typeof meta?.image === "string" && meta.image.startsWith("data:image/svg+xml;base64,")) {
        const svgB64 = meta.image.slice("data:image/svg+xml;base64,".length);
        const svg = safeAtob(svgB64);
        return svg?.includes("<svg") ? svg : null;
      }
    } catch {
      return null;
    }
  }

  return null;
}

// Small sleep helper for retries
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Retry wrapper (RPCs often flake on getLogs)
async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      // backoff: 250ms, 750ms, 1500ms...
      await sleep(250 + i * 500);
    }
  }
  throw lastErr;
}

export default function CollectionPreview({
  deployBlock = 37969324n,
}: {
  deployBlock?: bigint;
}) {
  // wagmi client (can be flaky for getLogs in some in-app contexts)
  const wagmiPc = usePublicClient({ chainId: base.id });

  const contractAddr = BASEBOTS.address as `0x${string}`;

  const title = useMemo(() => "Recently Minted", []);

  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<MintCard[]>([]);
  const [error, setError] = useState<string>("");

  // Dedicated RPC client (recommended)
  const rpcUrl = (process.env.NEXT_PUBLIC_BASE_RPC_URL || "").trim();
  const dedicatedPc = useMemo(() => {
    if (!rpcUrl) return null;
    return createPublicClient({
      chain: base,
      transport: http(rpcUrl, {
        // viem will handle fetch; keep it simple
        timeout: 20_000,
      }),
    });
  }, [rpcUrl]);

  const loadRecentMints = useCallback(async () => {
    const pc = dedicatedPc ?? wagmiPc; // prefer dedicated
    if (!pc) return;

    setLoading(true);
    setError("");

    try {
      const latest = await withRetry(() => pc.getBlockNumber(), 3);

      // Use smaller chunks to avoid provider limits
      const CHUNK = 8_000n;

      let toBlock = latest;
      let fromBlock = deployBlock;

      if (fromBlock > latest) fromBlock = latest;

      const found: Array<{ tokenId: bigint; blockNumber: bigint; logIndex: number }> = [];

      // hard cap: don’t hang
      for (let tries = 0; tries < 18 && found.length < 4; tries++) {
        const logs = await withRetry(
          () =>
            pc.getLogs({
              address: contractAddr,
              event: ERC721_TRANSFER_EVENT,
              args: { from: zeroAddress },
              fromBlock,
              toBlock,
            }),
          3
        );

        const sortedLogs = [...logs].sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
          return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
        });

        for (const l of sortedLogs) {
          const tid = (l.args as any)?.tokenId as bigint | undefined;
          if (tid === undefined) continue;
          if (!found.some((x) => x.tokenId === tid)) {
            found.push({ tokenId: tid, blockNumber: l.blockNumber!, logIndex: l.logIndex ?? 0 });
            if (found.length >= 4) break;
          }
        }

        if (fromBlock === deployBlock) {
          // if we’re already at deployBlock and still not enough, stop
          if (toBlock <= deployBlock) break;
        }

        // move window back
        if (fromBlock === 0n) break;

        toBlock = fromBlock > 0n ? fromBlock - 1n : 0n;
        const nextFrom = toBlock > CHUNK ? toBlock - CHUNK : 0n;

        // never go below deployBlock
        fromBlock = nextFrom < deployBlock ? deployBlock : nextFrom;

        if (toBlock < deployBlock) break;
      }

      const tokenIds = found
        .sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
          return Number(b.blockNumber - a.blockNumber);
        })
        .slice(0, 4)
        .map((x) => x.tokenId);

      if (tokenIds.length === 0) {
        setCards([]);
        return;
      }

      const urisRes = await withRetry(
        () =>
          pc.multicall({
            allowFailure: true,
            contracts: tokenIds.map((tid) => ({
              address: contractAddr,
              abi: ERC721_TOKENURI_ABI,
              functionName: "tokenURI",
              args: [tid],
            })),
          }),
        3
      );

      const nextCards: MintCard[] = tokenIds.map((tid, i) => {
        const uri = (urisRes as any)[i]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        return { tokenId: tid, svg };
      });

      setCards(nextCards);
    } catch (e) {
      console.error("Recently minted load failed", e);

      // If they didn't set a dedicated RPC, give a helpful hint.
      const hint =
        !rpcUrl
          ? " Tip: set NEXT_PUBLIC_BASE_RPC_URL (mainnet.base.org or Alchemy/QuickNode) — some in-app providers block log queries."
          : "";

      setError(`${getErrText(e)}.${hint}`);
    } finally {
      setLoading(false);
    }
  }, [dedicatedPc, wagmiPc, contractAddr, deployBlock, rpcUrl]);

  return (
    <section className="w-full flex justify-center">
      <div className="glass glass-pad w-full max-w-md sm:max-w-lg md:max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-extrabold tracking-tight text-3xl md:text-4xl bg-gradient-to-r from-cyan-300 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">
              {title}
            </h2>
            <div
              aria-hidden
              className="mt-3 h-1 w-28 rounded-full bg-gradient-to-r from-cyan-400/70 via-blue-400/70 to-fuchsia-500/70"
            />
          </div>

          <button
            type="button"
            onClick={() => void loadRecentMints()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79ffe1]/60 active:scale-95 transition-transform"
            title={!rpcUrl ? "Set NEXT_PUBLIC_BASE_RPC_URL for best reliability" : undefined}
          >
            {loading ? (
              <span className="h-3 w-3 animate-spin rounded-full border border-white/50 border-t-transparent" />
            ) : (
              <span className="h-3 w-3 rounded-full border border-white/25 bg-white/10" />
            )}
            <span>{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </div>

        {error && <p className="mt-4 text-center text-sm text-rose-300 break-words">{error}</p>}

        {!loading && !error && cards.length === 0 && (
          <p className="mt-4 text-center text-sm text-white/70">
            Click <span className="font-semibold text-white/80">Refresh</span> to load the last 4 minted.
          </p>
        )}

        {cards.length > 0 && (
          <div className="mt-6 flex flex-wrap -mx-2 min-w-0">
            {cards.map((bot) => (
              <motion.div
                key={bot.tokenId.toString()}
                whileHover={{ scale: 1.05, y: -3 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 220, damping: 16 }}
                className="w-1/2 px-2 mb-4 min-w-0"
              >
                <div className="aspect-square rounded-xl border border-white/10 bg-gradient-to-br from-[#141820] to-[#0b0e14] shadow-md overflow-hidden flex items-center justify-center relative">
                  {bot.svg ? (
                    <div
                      className="w-full h-full p-2 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: bot.svg }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-white/60">
                      <div className="h-6 w-6 animate-spin rounded-full border border-white/30 border-t-transparent" />
                      <div className="mt-2 text-[11px]">Rendering…</div>
                    </div>
                  )}

                  <div className="absolute left-2 bottom-2 rounded-full border border-white/15 bg-black/35 px-2 py-[2px] text-[11px] text-white/75">
                    FID #{bot.tokenId.toString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <p className="mt-1 text-center text-[11px] text-white/45">
          Pulled from on-chain mint events (Transfer from zero address) and rendered from on-chain tokenURI SVG.
        </p>
      </div>
    </section>
  );
}
