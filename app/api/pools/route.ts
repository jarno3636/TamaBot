// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";
// OPTIONAL: if you have / can add a helper that fetches all pools without creator.
// If you don't have it, the fallback below just calls fetchPoolsByCreator(undefined as any)
// and relies on your lib to treat undefined as "all".
// import { fetchAllPools } from "@/lib/fetchFactoryPoolsAll";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * In-memory cache to reduce RPC load + prevent 429s.
 * Note: This cache lives per server instance (Vercel/Node; best-effort).
 */
type CacheEntry = {
  expiresAt: number;
  value: any;
};

type InFlightEntry = Promise<any>;

const g = globalThis as any;

// cache maps
const POOLS_CACHE: Map<string, CacheEntry> =
  g.__POOLS_CACHE__ ?? (g.__POOLS_CACHE__ = new Map());
const POOLS_INFLIGHT: Map<string, InFlightEntry> =
  g.__POOLS_INFLIGHT__ ?? (g.__POOLS_INFLIGHT__ = new Map());

function safeBigInt(input: string | null): bigint | undefined {
  if (!input) return undefined;
  if (!/^\d+$/.test(input)) return undefined;
  try {
    return BigInt(input);
  } catch {
    return undefined;
  }
}

function safeNumber(input: string | null): number | undefined {
  if (!input) return undefined;
  if (!/^\d+$/.test(input)) return undefined;
  const n = Number(input);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function parseAddressesParam(input: string | null): `0x${string}`[] | undefined {
  if (!input) return undefined;
  const parts = input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length === 0) return undefined;

  const out: `0x${string}`[] = [];
  for (const p of parts) {
    if (!isAddress(p)) return undefined;
    out.push(p as `0x${string}`);
  }
  // de-dupe
  return Array.from(new Set(out.map((a) => a.toLowerCase()))).map((a) => a as `0x${string}`);
}

function makeKey(params: {
  creator?: string;
  addresses?: string | null;
  window?: string | null;
  step?: string | null;
  throttle?: string | null;
}) {
  const c = params.creator ? params.creator.toLowerCase() : "";
  const a = params.addresses ? params.addresses.toLowerCase() : "";
  return [
    `creator=${c}`,
    `addresses=${a}`,
    `window=${params.window ?? ""}`,
    `step=${params.step ?? ""}`,
    `throttle=${params.throttle ?? ""}`,
  ].join("&");
}

/**
 * Normalize pool objects to a stable minimal shape used by the UI.
 * We keep original fields too (non-destructive) but ensure these exist:
 * - pool
 * - creator
 * - nft
 * - rewardToken
 */
function normalizePools(pools: any[]): any[] {
  if (!Array.isArray(pools)) return [];

  return pools
    .map((p) => {
      if (!p) return null;

      // Try common keys from event decoders / previous code
      const pool = p.pool ?? p.poolAddress ?? p.stakingPool ?? p.addr ?? p.address;
      const creator = p.creator ?? p.owner ?? p.deployer ?? p.admin;
      const nft = p.nft ?? p.nftAddress ?? p.collection ?? p.erc721;
      const rewardToken = p.rewardToken ?? p.reward_token ?? p.reward ?? p.erc20;

      if (!pool || !creator || !nft || !rewardToken) return null;

      return {
        ...p,
        pool,
        creator,
        nft,
        rewardToken,
      };
    })
    .filter(Boolean);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const creatorParam = searchParams.get("creator");
  const creator =
    creatorParam && isAddress(creatorParam)
      ? (creatorParam as `0x${string}`)
      : undefined;

  // invalid creator → clean 400
  if (creatorParam && !creator) {
    return NextResponse.json(
      { ok: false, error: `Invalid creator address: ${creatorParam}` },
      { status: 400 },
    );
  }

  // Optional: directly query known pool addresses (future-proof)
  const addressesParam = searchParams.get("addresses");
  const addresses = parseAddressesParam(addressesParam);
  if (addressesParam && !addresses) {
    return NextResponse.json(
      { ok: false, error: `Invalid addresses (must be comma-separated 0x...): ${addressesParam}` },
      { status: 400 },
    );
  }

  // Optional tuning knobs (validated)
  const windowParam = searchParams.get("window"); // blocks
  const stepParam = searchParams.get("step"); // blocks
  const throttleParam = searchParams.get("throttle"); // ms

  const windowBlocks = safeBigInt(windowParam);
  const stepBlocks = safeBigInt(stepParam);
  const throttleMs = safeNumber(throttleParam);

  if (windowParam && windowBlocks === undefined) {
    return NextResponse.json(
      { ok: false, error: `Invalid window (must be integer blocks): ${windowParam}` },
      { status: 400 },
    );
  }
  if (stepParam && stepBlocks === undefined) {
    return NextResponse.json(
      { ok: false, error: `Invalid step (must be integer blocks): ${stepParam}` },
      { status: 400 },
    );
  }
  if (throttleParam && throttleMs === undefined) {
    return NextResponse.json(
      { ok: false, error: `Invalid throttle (must be integer ms): ${throttleParam}` },
      { status: 400 },
    );
  }

  // ---- Cache config ----
  // Slight bump helps prevent stampedes on busy pages; still "fresh enough".
  const TTL_MS = 35_000;

  const key = makeKey({
    creator,
    addresses: addressesParam,
    window: windowParam,
    step: stepParam,
    throttle: throttleParam,
  });

  // Serve cache if fresh
  const cached = POOLS_CACHE.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    const res = NextResponse.json({ ok: true, pools: cached.value });
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=10");
    res.headers.set("X-Pools-Cache", "HIT");
    return res;
  }

  // Single-flight
  const inflight = POOLS_INFLIGHT.get(key);
  if (inflight) {
    try {
      const pools = await inflight;
      const res = NextResponse.json({ ok: true, pools });
      res.headers.set("Cache-Control", "public, max-age=0, s-maxage=10");
      res.headers.set("X-Pools-Cache", "JOIN");
      return res;
    } catch (e: any) {
      const res = NextResponse.json(
        { ok: false, error: e?.message ?? "Failed to load pools" },
        { status: 500 },
      );
      res.headers.set("X-Pools-Cache", "JOIN_ERR");
      return res;
    }
  }

  // ✅ Only pass opts if the user provided them
  const opts =
    windowBlocks !== undefined || stepBlocks !== undefined || throttleMs !== undefined
      ? {
          ...(windowBlocks !== undefined ? { windowBlocks } : {}),
          ...(stepBlocks !== undefined ? { stepBlocks } : {}),
          ...(throttleMs !== undefined ? { throttleMs } : {}),
        }
      : undefined;

  const p = (async () => {
    // If you later add a "fetchPoolsByAddresses", you can wire it here.
    // For now we just ignore `addresses` because fetchFactoryPools typically finds pools via logs anyway.
    // (addresses param is still validated and included in cache key, so it's safe to support later.)

    // Case 1: creator provided
    if (creator) {
      return opts ? await fetchPoolsByCreator(creator, opts) : await fetchPoolsByCreator(creator);
    }

    // Case 2: no creator → return ALL pools (whatever your lib defines as full scan)
    // If your fetchPoolsByCreator requires a creator, change your lib to accept undefined and treat as all,
    // or create fetchAllPools and call it here.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return opts ? await fetchPoolsByCreator(undefined as any, opts) : await fetchPoolsByCreator(undefined as any);
  })();

  POOLS_INFLIGHT.set(key, p);

  try {
    const raw = await p;
    const pools = normalizePools(raw);

    POOLS_CACHE.set(key, {
      value: pools,
      expiresAt: Date.now() + TTL_MS,
    });

    // housekeeping
    if (POOLS_CACHE.size > 250) {
      const t = Date.now();
      for (const [k, v] of POOLS_CACHE) {
        if (v.expiresAt <= t) POOLS_CACHE.delete(k);
      }
      while (POOLS_CACHE.size > 250) {
        const firstKey = POOLS_CACHE.keys().next().value;
        if (!firstKey) break;
        POOLS_CACHE.delete(firstKey);
      }
    }

    const res = NextResponse.json({ ok: true, pools });
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=10");
    res.headers.set("X-Pools-Cache", "MISS");
    return res;
  } catch (e: any) {
    console.error("[/api/pools] error", {
      creator,
      addresses,
      message: e?.message,
      shortMessage: e?.shortMessage,
      name: e?.name,
      cause: e?.cause,
      stack: e?.stack,
    });

    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load pools" },
      { status: 500 },
    );
  } finally {
    POOLS_INFLIGHT.delete(key);
  }
}
