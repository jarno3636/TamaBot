// lib/fetchFactoryPools.ts
import "server-only";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import {
  CONFIG_STAKING_FACTORY,
  CONFIG_STAKING_FACTORY_DEPLOY_BLOCK,
} from "./stakingContracts";

type Options = { windowBlocks?: bigint };

const RPC_URL =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    timeout: 20_000,
    retryCount: 3,
    retryDelay: 500,
  }),
});

const PoolCreated = parseAbiItem(
  "event PoolCreated(address indexed pool,address indexed creator,address indexed nft,address rewardToken)",
);

export async function fetchPoolsByCreator(
  creator?: `0x${string}`,
  opts: Options = {},
) {
  const latest = await client.getBlockNumber();

  const windowBlocks = opts.windowBlocks ?? 150_000n;
  const minWindowBlock = latest > windowBlocks ? latest - windowBlocks : 0n;

  const from =
    CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > minWindowBlock
      ? CONFIG_STAKING_FACTORY_DEPLOY_BLOCK
      : minWindowBlock;

  // If you still get 500, drop this to 25_000n
  const STEP = 50_000n;

  const logs: any[] = [];

  for (let start = from; start <= latest; start += STEP) {
    const end = start + STEP - 1n > latest ? latest : start + STEP - 1n;

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
      const msg = e?.shortMessage || e?.message || "getLogs failed";
      const err = new Error(
        `${msg} | rpc=${RPC_URL} | factory=${CONFIG_STAKING_FACTORY.address} | range=${start.toString()}-${end.toString()}`,
      );
      (err as any).cause = e;
      throw err;
    }
  }

  logs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

  const map = new Map<string, any>();
  for (const l of logs) map.set((l.args.pool as string).toLowerCase(), l);

  return Array.from(map.values()).map((l) => ({
    pool: l.args.pool as `0x${string}`,
    creator: l.args.creator as `0x${string}`,
    nft: l.args.nft as `0x${string}`,
    rewardToken: l.args.rewardToken as `0x${string}`,
    blockNumber: l.blockNumber,
    txHash: l.transactionHash,
  }));
}
