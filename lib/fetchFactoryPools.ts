// lib/fetchFactoryPools.ts
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";
import {
  CONFIG_STAKING_FACTORY,
  CONFIG_STAKING_FACTORY_DEPLOY_BLOCK,
} from "./stakingContracts";

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
  "event PoolCreated(address indexed pool, address indexed creator, address indexed nft, address rewardToken)"
);

export async function fetchPoolsByCreator(creator?: `0x${string}`) {
  const from = CONFIG_STAKING_FACTORY_DEPLOY_BLOCK;
  const latest = await client.getBlockNumber();

  // tune this if your RPC complains; 25k–100k is common
  const STEP = 50_000n;

  const logs: any[] = [];
  for (let start = from; start <= latest; start += STEP) {
    const end = start + STEP - 1n > latest ? latest : start + STEP - 1n;

    const chunk = await client.getLogs({
      address: CONFIG_STAKING_FACTORY.address,
      event: PoolCreated,
      fromBlock: start,
      toBlock: end,
      // if you only need “my pools”, filter here (faster + fewer logs)
      ...(creator
        ? { args: { creator } }
        : {}),
    });

    logs.push(...chunk);
  }

  // newest first
  logs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

  return logs.map((l) => ({
    pool: l.args.pool as `0x${string}`,
    creator: l.args.creator as `0x${string}`,
    nft: l.args.nft as `0x${string}`,
    rewardToken: l.args.rewardToken as `0x${string}`,
    blockNumber: l.blockNumber,
    txHash: l.transactionHash,
  }));
}
