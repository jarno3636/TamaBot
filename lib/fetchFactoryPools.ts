// lib/fetchFactoryPools.ts
import "server-only";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import {
  CONFIG_STAKING_FACTORY,
  CONFIG_STAKING_FACTORY_DEPLOY_BLOCK,
} from "./stakingContracts";

type Options = {
  // optional: how far back from latest to scan
  windowBlocks?: bigint;
  // chunk size
  stepBlocks?: bigint;
  // throttle between chunks (ms)
  throttleMs?: number;
};

const RPC_URL =
  process.env.BASE_POOLS_RPC_URL || // preferred (server-only, heavy logs)
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(e: any) {
  const msg = String(e?.message || e?.shortMessage || "").toLowerCase();
  const status = e?.status || e?.cause?.status;
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("over rate limit")
  );
}

// Simple in-memory cache for warm runtime
const cache = new Map<string, { at: number; value: any }>();
const CACHE_TTL_MS = 60_000;

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    timeout: 25_000,
    retryCount: 0,
  }),
});

// ✅ Your event signature is correct
const PoolCreated = parseAbiItem(
  "event PoolCreated(address indexed pool,address indexed creator,address indexed nft,address rewardToken)",
);

export async function fetchPoolsByCreator(
  creator?: `0x${string}`,
  opts: Options = {},
) {
  const stepBlocks = opts.stepBlocks ?? 2_000n;
  const throttleMs = opts.throttleMs ?? 150;

  // ✅ IMPORTANT: default is FULL HISTORY from deploy block
  // Only use a window if explicitly provided.
  const windowBlocks = opts.windowBlocks;

  const cacheKey = [
    (creator?.toLowerCase() ?? "all"),
    (windowBlocks?.toString() ?? "FULL"),
    stepBlocks.toString(),
    String(throttleMs),
  ].join("|");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const latest = await client.getBlockNumber();

  // ✅ Sanity #1: deploy block must exist on this RPC
  if (latest < CONFIG_STAKING_FACTORY_DEPLOY_BLOCK) {
    throw new Error(
      [
        "RPC/network mismatch: latest block is below factory deploy block.",
        `latest=${latest.toString()}`,
        `deploy=${CONFIG_STAKING_FACTORY_DEPLOY_BLOCK.toString()}`,
        `rpc=${RPC_URL}`,
        "This usually means BASE_RPC_URL/BASE_POOLS_RPC_URL points to the wrong chain (e.g., Base Sepolia).",
      ].join("\n"),
    );
  }

  // ✅ Sanity #2: address must have bytecode
  const code = await client.getBytecode({ address: CONFIG_STAKING_FACTORY.address });
  if (!code || code === "0x") {
    throw new Error(
      [
        "Factory address has no bytecode on this RPC/network.",
        `factory=${CONFIG_STAKING_FACTORY.address}`,
        `rpc=${RPC_URL}`,
        "Double-check the address + that your RPC is Base mainnet.",
      ].join("\n"),
    );
  }

  // Determine scan range
  const from = (() => {
    if (windowBlocks === undefined) {
      // full history
      return CONFIG_STAKING_FACTORY_DEPLOY_BLOCK;
    }
    const minWindow = latest > windowBlocks ? latest - windowBlocks : 0n;
    return CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > minWindow
      ? CONFIG_STAKING_FACTORY_DEPLOY_BLOCK
      : minWindow;
  })();

  const logs: any[] = [];

  for (let start = from; start <= latest; start += stepBlocks) {
    const end =
      start + stepBlocks - 1n > latest ? latest : start + stepBlocks - 1n;

    let attempt = 0;
    const maxAttempts = 6;

    while (true) {
      try {
        const chunk = await client.getLogs({
          address: CONFIG_STAKING_FACTORY.address,
          event: PoolCreated,
          fromBlock: start,
          toBlock: end,
          ...(creator ? { args: { creator } } : {}),
        });

        logs.push(...chunk);
        break;
      } catch (e: any) {
        attempt++;

        if (isRateLimitError(e) && attempt < maxAttempts) {
          const baseDelay = 600 * Math.pow(2, attempt - 1);
          const jitter = Math.floor(Math.random() * 250);
          await sleep(baseDelay + jitter);
          continue;
        }

        const msg = e?.message || e?.shortMessage || "RPC request failed.";
        const err = new Error(
          `${msg}\n\nrpc=${RPC_URL} | factory=${CONFIG_STAKING_FACTORY.address} | range=${start}-${end}`,
        );
        (err as any).cause = e;
        throw err;
      }
    }

    if (throttleMs > 0) await sleep(throttleMs);
  }

  // newest first
  logs.sort((a, b) => {
    const A = (a.blockNumber ?? 0n) as bigint;
    const B = (b.blockNumber ?? 0n) as bigint;
    if (A === B) return 0;
    return A > B ? -1 : 1;
  });

  // de-dupe by pool (keep newest)
  const map = new Map<string, any>();
  for (const l of logs) {
    map.set(String(l.args.pool).toLowerCase(), l);
  }

  const result = Array.from(map.values()).map((l) => ({
    pool: l.args.pool as `0x${string}`,
    creator: l.args.creator as `0x${string}`,
    nft: l.args.nft as `0x${string}`,
    rewardToken: l.args.rewardToken as `0x${string}`,
    blockNumber: (l.blockNumber as bigint).toString(),
    txHash: l.transactionHash as `0x${string}`,
  }));

  cache.set(cacheKey, { at: Date.now(), value: result });
  return result;
}
