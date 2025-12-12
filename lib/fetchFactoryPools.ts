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
  windowBlocks?: bigint; // default 300k
  // how big each getLogs chunk is
  stepBlocks?: bigint; // default 10k
  // throttle between chunks (ms)
  throttleMs?: number; // default 150ms
};

const RPC_URL =
  process.env.BASE_RPC_URL ||
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Custom fetch to expose real HTTP status + body when RPC fails.
// This is the key to diagnosing "HTTP request failed".
async function debugFetch(input: RequestInfo | URL, init?: RequestInit) {
  const res = await fetch(input, init);

  if (!res.ok) {
    // Try to read body safely (Alchemy often returns JSON errors)
    let bodyText = "";
    try {
      bodyText = await res.text();
    } catch {
      bodyText = "<no body>";
    }

    const url = typeof input === "string" ? input : String(input);
    const msg = `RPC HTTP ${res.status} ${res.statusText} | url=${url} | body=${bodyText.slice(
      0,
      500,
    )}`;

    const err = new Error(msg);
    (err as any).status = res.status;
    throw err;
  }

  return res;
}

const client = createPublicClient({
  chain: base,
  transport: http(RPC_URL, {
    timeout: 25_000,
    retryCount: 2,
    retryDelay: 500,
    fetch: debugFetch, // 👈 important
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
  const stepBlocks = opts.stepBlocks ?? 10_000n;
  const throttleMs = opts.throttleMs ?? 150;

  try {
    const latest = await client.getBlockNumber();

    const minWindowBlock = latest > windowBlocks ? latest - windowBlocks : 0n;
    const from =
      CONFIG_STAKING_FACTORY_DEPLOY_BLOCK > minWindowBlock
        ? CONFIG_STAKING_FACTORY_DEPLOY_BLOCK
        : minWindowBlock;

    const logs: any[] = [];

    for (let start = from; start <= latest; start += stepBlocks) {
      const end = start + stepBlocks - 1n > latest ? latest : start + stepBlocks - 1n;

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
        // Attach range details so your API prints the exact failing slice.
        const msg =
          e?.message ||
          e?.shortMessage ||
          "HTTP request failed.";

        const err = new Error(
          `${msg} | rpc=${RPC_URL} | factory=${CONFIG_STAKING_FACTORY.address} | range=${start.toString()}-${end.toString()}`,
        );
        (err as any).cause = e;
        throw err;
      }

      if (throttleMs > 0) await sleep(throttleMs);
    }

    // newest first
    logs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

    // de-dupe by pool (keep newest)
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
      e?.message ||
      e?.shortMessage ||
      "fetchPoolsByCreator failed (unknown)";

    const err = new Error(
      `${msg} | rpc=${RPC_URL} | factory=${CONFIG_STAKING_FACTORY.address} | deployBlock=${CONFIG_STAKING_FACTORY_DEPLOY_BLOCK.toString()}`,
    );
    (err as any).cause = e;
    throw err;
  }
}
