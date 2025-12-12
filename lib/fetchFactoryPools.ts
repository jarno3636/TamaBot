// lib/fetchFactoryPools.ts
import "server-only";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import {
  CONFIG_STAKING_FACTORY,
  CONFIG_STAKING_FACTORY_DEPLOY_BLOCK,
} from "./stakingContracts";

type Options = {
  // how far back from latest to scan
  windowBlocks?: bigint; // default 200k
  // how big each getLogs chunk is
  stepBlocks?: bigint; // default 500
  // throttle between chunks (ms)
  throttleMs?: number; // default 200
};

const RPC_URL =
  process.env.BASE_POOLS_RPC_URL || // ✅ server-only RPC for heavy log scanning
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function isRateLimitError(e: any) {
  const msg = String(e?.message || e?.shortMessage || "").toLowerCase();
  // viem often wraps status in message; sometimes the cause has status
  const status = e?.status || e?.cause?.status;
  return (
    status === 429 ||
    msg.includes("429") ||
    msg.includes("rate limit") ||
    msg.includes("over rate limit")
  );
}

// Simple in-memory cache for server runtime (works within a warm lambda)
const cache = new Map<string, { at: number; value: any }>();
const CACHE_TTL_MS = 60_000; // 60s (tune if needed)

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    timeout: 25_000,
    retryCount: 0, // we'll do our own retry w/ backoff below
  }),
});

const PoolCreated = parseAbiItem(
  "event PoolCreated(address indexed pool,address indexed creator,address indexed nft,address rewardToken)",
);

export async function fetchPoolsByCreator(
  creator?: `0x${string}`,
  opts: Options = {},
) {
  const windowBlocks = opts.windowBlocks ?? 200_000n;
  const stepBlocks = opts.stepBlocks ?? 500n; // ✅ smaller chunks reduce RPC pressure
  const throttleMs = opts.throttleMs ?? 200;

  // Cache key varies by creator + window/step
  const cacheKey = [
    creator?.toLowerCase() ?? "all",
    windowBlocks.toString(),
    stepBlocks.toString(),
  ].join("|");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const latest = await client.getBlockNumber();
  const minWindowBlock = latest > windowBlocks ? latest - windowBlocks : 0n;

  const from =
    CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > minWindowBlock
      ? CONFIG_STAKING_FACTORY_DEPLOY_BLOCK
      : minWindowBlock;

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
        break; // success
      } catch (e: any) {
        attempt++;

        if (isRateLimitError(e) && attempt < maxAttempts) {
          // exponential backoff + jitter
          const baseDelay = 600 * Math.pow(2, attempt - 1); // 600ms, 1.2s, 2.4s...
          const jitter = Math.floor(Math.random() * 250);
          await sleep(baseDelay + jitter);
          continue;
        }

        const msg = e?.message || e?.shortMessage || "HTTP request failed.";
        const err = new Error(
          `${msg}\n\nrpc=${RPC_URL} | factory=${CONFIG_STAKING_FACTORY.address} | range=${start.toString()}-${end.toString()}`,
        );
        (err as any).cause = e;
        throw err;
      }
    }

    if (throttleMs > 0) await sleep(throttleMs);
  }

  // newest first
  logs.sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)));

  // de-dupe by pool (keep newest)
  const map = new Map<string, any>();
  for (const l of logs) {
    map.set((l.args.pool as string).toLowerCase(), l);
  }

  // ✅ BigInt-safe response (strings)
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
