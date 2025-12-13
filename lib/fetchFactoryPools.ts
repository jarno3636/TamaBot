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
  windowBlocks?: bigint; // default varies (see below)
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
const CACHE_TTL_MS = 60_000; // 60s

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    timeout: 25_000,
    retryCount: 0, // we do our own backoff
  }),
});

const PoolCreated = parseAbiItem(
  "event PoolCreated(address indexed pool,address indexed creator,address indexed nft,address rewardToken)",
);

export async function fetchPoolsByCreator(
  creator?: `0x${string}`,
  opts: Options = {},
) {
  const stepBlocks = opts.stepBlocks ?? 500n;
  const throttleMs = opts.throttleMs ?? 200;

  // IMPORTANT:
  // - If creator is provided and caller did NOT provide a windowBlocks,
  //   scan full history from deploy block (so "My pools" never misses older pools).
  // - If creator is not provided, use a window to keep "All pools" fast.
  const defaultWindowBlocks = creator ? undefined : 200_000n;
  const windowBlocks = opts.windowBlocks ?? defaultWindowBlocks;

  // Cache key varies by creator + knobs
  const cacheKey = [
    (creator?.toLowerCase() ?? "all"),
    (windowBlocks?.toString() ?? "full"),
    stepBlocks.toString(),
    String(throttleMs),
  ].join("|");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const latest = await client.getBlockNumber();

  // Determine scan start:
  // - full scan: deploy block
  // - window scan: max(deploy block, latest - window)
  let from: bigint = CONFIG_STAKING_FACTORY_DEPLOY_BLOCK;

  if (windowBlocks !== undefined) {
    const minWindowBlock = latest > windowBlocks ? latest - windowBlocks : 0n;
    from =
      CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > minWindowBlock
        ? CONFIG_STAKING_FACTORY_DEPLOY_BLOCK
        : minWindowBlock;
  }

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

  // newest first (avoid Number(bigint) overflow)
  logs.sort((a, b) => {
    const A = (a.blockNumber ?? 0n) as bigint;
    const B = (b.blockNumber ?? 0n) as bigint;
    if (A === B) return 0;
    return A > B ? -1 : 1;
  });

  // de-dupe by pool (keep newest)
  const map = new Map<string, any>();
  for (const l of logs) {
    map.set((l.args.pool as string).toLowerCase(), l);
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
