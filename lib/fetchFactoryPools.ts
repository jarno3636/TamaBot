// lib/fetchFactoryPools.ts
import "server-only";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import {
  CONFIG_STAKING_FACTORY,
  CONFIG_STAKING_FACTORY_DEPLOY_BLOCK,
} from "./stakingContracts";

type Options = {
  windowBlocks?: bigint; // default 300k
  stepBlocks?: bigint; // default 2k–5k for public RPC
  throttleMs?: number;
};

const RPC_URL =
  process.env.BASE_POOLS_RPC_URL || // 👈 server-only RPC for scanning
  process.env.BASE_RPC_URL ||
  "https://mainnet.base.org";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    timeout: 25_000,
    retryCount: 2,
    retryDelay: 400,
  }),
});

const PoolCreated = parseAbiItem(
  "event PoolCreated(address indexed pool,address indexed creator,address indexed nft,address rewardToken)",
);

export async function fetchPoolsByCreator(
  creator?: `0x${string}`,
  opts: Options = {},
) {
  const windowBlocks = opts.windowBlocks ?? 300_000n;
  const stepBlocks = opts.stepBlocks ?? 2_000n; // ✅ safe for public RPC providers
  const throttleMs = opts.throttleMs ?? 120;

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

    try {
      const chunk = await client.getLogs({
        address: CONFIG_STAKING_FACTORY.address,
        event: PoolCreated,
        fromBlock: start,
        toBlock: end,
        ...(creator ? { args: { creator } } : {}),
      });

      logs.push(...chunk);
    } catch (e: any) {
      const msg = e?.message || e?.shortMessage || "HTTP request failed.";
      const err = new Error(
        `${msg} | rpc=${RPC_URL} | factory=${CONFIG_STAKING_FACTORY.address} | range=${start.toString()}-${end.toString()}`,
      );
      (err as any).cause = e;
      throw err;
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

  // ✅ IMPORTANT: convert BigInt fields to string
  return Array.from(map.values()).map((l) => ({
    pool: l.args.pool as `0x${string}`,
    creator: l.args.creator as `0x${string}`,
    nft: l.args.nft as `0x${string}`,
    rewardToken: l.args.rewardToken as `0x${string}`,
    blockNumber: (l.blockNumber as bigint).toString(),
    txHash: l.transactionHash as `0x${string}`,
  }));
}
