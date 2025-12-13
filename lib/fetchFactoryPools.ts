// lib/fetchFactoryPools.ts
import "server-only";
import {
  createPublicClient,
  http,
  decodeEventLog,
  getAbiItem,
  type AbiEvent,
} from "viem";
import { base } from "viem/chains";
import {
  CONFIG_STAKING_FACTORY,
  CONFIG_STAKING_FACTORY_DEPLOY_BLOCK,
} from "./stakingContracts";

type Options = {
  windowBlocks?: bigint; // default varies
  stepBlocks?: bigint; // default 2k (less RPC spam)
  throttleMs?: number; // default 150
};

const RPC_URL =
  process.env.BASE_POOLS_RPC_URL ||
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

const cache = new Map<string, { at: number; value: any }>();
const CACHE_TTL_MS = 60_000;

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, { timeout: 25_000, retryCount: 0 }),
});

// ✅ Get the real PoolCreated event from your factory ABI
const poolCreatedEvent = getAbiItem({
  abi: CONFIG_STAKING_FACTORY.abi,
  name: "PoolCreated",
}) as AbiEvent;

const creatorInput = poolCreatedEvent.inputs?.find((i) => i.name === "creator");
const isCreatorIndexed = Boolean((creatorInput as any)?.indexed);

export async function fetchPoolsByCreator(
  creator?: `0x${string}`,
  opts: Options = {},
) {
  const stepBlocks = opts.stepBlocks ?? 2_000n;
  const throttleMs = opts.throttleMs ?? 150;

  // If creator is provided and caller did NOT provide windowBlocks, scan full history
  const defaultWindowBlocks = creator ? undefined : 200_000n;
  const windowBlocks = opts.windowBlocks ?? defaultWindowBlocks;

  const cacheKey = [
    (creator?.toLowerCase() ?? "all"),
    (windowBlocks?.toString() ?? "full"),
    stepBlocks.toString(),
    String(throttleMs),
  ].join("|");

  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const latest = await client.getBlockNumber();

  // Guard: deploy block accidentally set above latest
  if (CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > latest) {
    const empty: any[] = [];
    cache.set(cacheKey, { at: Date.now(), value: empty });
    return empty;
  }

  // Determine scan start
  let from: bigint = CONFIG_STAKING_FACTORY_DEPLOY_BLOCK;
  if (windowBlocks !== undefined) {
    const minWindow = latest > windowBlocks ? latest - windowBlocks : 0n;
    from =
      CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > minWindow
        ? CONFIG_STAKING_FACTORY_DEPLOY_BLOCK
        : minWindow;
  }

  const logs: any[] = [];

  for (let start = from; start <= latest; start += stepBlocks) {
    const end =
      start + stepBlocks - 1n > latest ? latest : start + stepBlocks - 1n;

    let attempt = 0;
    const maxAttempts = 6;

    while (true) {
      try {
        // ✅ Only pass args.creator if it is indexed
        const chunk = await client.getLogs({
          address: CONFIG_STAKING_FACTORY.address,
          event: poolCreatedEvent,
          fromBlock: start,
          toBlock: end,
          ...(creator && isCreatorIndexed ? { args: { creator } } : {}),
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

  // Decode + normalize (also handles non-indexed creator filtering)
  const decoded = logs
    .map((l) => {
      try {
        const d = decodeEventLog({
          abi: [poolCreatedEvent],
          data: l.data,
          topics: l.topics,
        });
        return { log: l, args: d.args as any };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ log: any; args: any }>;

  const filtered = creator
    ? decoded.filter(
        (x) =>
          String(x.args?.creator || "").toLowerCase() ===
          creator.toLowerCase(),
      )
    : decoded;

  // newest first
  filtered.sort((a, b) => {
    const A = (a.log.blockNumber ?? 0n) as bigint;
    const B = (b.log.blockNumber ?? 0n) as bigint;
    if (A === B) return 0;
    return A > B ? -1 : 1;
  });

  // de-dupe by pool
  const map = new Map<string, any>();
  for (const x of filtered) {
    const poolAddr = String(x.args?.pool || "").toLowerCase();
    if (!poolAddr) continue;
    if (!map.has(poolAddr)) map.set(poolAddr, x);
  }

  const result = Array.from(map.values()).map((x) => ({
    pool: x.args.pool as `0x${string}`,
    creator: x.args.creator as `0x${string}`,
    nft: x.args.nft as `0x${string}`,
    rewardToken: x.args.rewardToken as `0x${string}`,
    blockNumber: (x.log.blockNumber as bigint).toString(),
    txHash: x.log.transactionHash as `0x${string}`,
  }));

  cache.set(cacheKey, { at: Date.now(), value: result });
  return result;
}
