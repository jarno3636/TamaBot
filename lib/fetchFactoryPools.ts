// lib/fetchFactoryPools.ts
import "server-only";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import {
  CONFIG_STAKING_FACTORY,
  CONFIG_STAKING_FACTORY_DEPLOY_BLOCK,
} from "./stakingContracts";

type Options = {
  // How far back to scan from latest block (default 500k).
  // Increase if you deployed long ago and need older pools.
  windowBlocks?: bigint;
};

const RPC_URL =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org"; // fallback (often rate-limited)

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    timeout: 20_000,
    retryCount: 3,
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
  try {
    const latest = await client.getBlockNumber();

    // ✅ Cap scan window so Vercel doesn’t time out / RPC doesn’t rate-limit.
    // You can override via /api/pools?window=1500000 etc.
    const windowBlocks = opts.windowBlocks ?? 500_000n;
    const minWindowBlock = latest > windowBlocks ? latest - windowBlocks : 0n;

    const from =
      CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > minWindowBlock
        ? CONFIG_STAKING_FACTORY_DEPLOY_BLOCK
        : minWindowBlock;

    // tune this if your RPC complains (25k–100k typical)
    const STEP = 50_000n;

    const logs: any[] = [];

    for (let start = from; start <= latest; start += STEP) {
      const end = start + STEP - 1n > latest ? latest : start + STEP - 1n;

      const chunk = await client.getLogs({
        address: CONFIG_STAKING_FACTORY.address,
        event: PoolCreated,
        fromBlock: start,
        toBlock: end,
        ...(creator ? { args: { creator } } : {}),
      });

      logs.push(...chunk);
    }

    // newest first
    logs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

    // de-dupe by pool address (keep newest)
    const map = new Map<string, any>();
    for (const l of logs) {
      map.set((l.args.pool as string).toLowerCase(), l);
    }

    return Array.from(map.values()).map((l) => ({
      pool: l.args.pool as `0x${string}`,
      creator: l.args.creator as `0x${string}`,
      nft: l.args.nft as `0x${string}`,
      rewardToken: l.args.rewardToken as `0x${string}`,
      blockNumber: l.blockNumber,
      txHash: l.transactionHash,
    }));
  } catch (e: any) {
    const msg =
      e?.shortMessage ||
      e?.message ||
      "fetchPoolsByCreator failed (unknown RPC/log error)";

    // ✅ TS-safe: do NOT pass `{ cause }` as 2nd param (breaks on older TS/lib)
    const err = new Error(
      `${msg} | rpc=${RPC_URL} | factory=${CONFIG_STAKING_FACTORY.address} | deployBlock=${CONFIG_STAKING_FACTORY_DEPLOY_BLOCK.toString()}`,
    );

    // attach cause without requiring TS lib support
    (err as any).cause = e;

    throw err;
  }
}
