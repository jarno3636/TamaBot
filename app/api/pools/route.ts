// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CacheEntry = { expiresAt: number; value: any };
type InFlightEntry = Promise<any>;

const g = globalThis as any;

const POOLS_CACHE: Map<string, CacheEntry> = g.__POOLS_CACHE__ ?? (g.__POOLS_CACHE__ = new Map());
const POOLS_INFLIGHT: Map<string, InFlightEntry> = g.__POOLS_INFLIGHT__ ?? (g.__POOLS_INFLIGHT__ = new Map());

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

function normalizePools(pools: any[]): any[] {
  if (!Array.isArray(pools)) return [];
  return pools
    .map((p) => {
      if (!p) return null;
      const pool = p.pool ?? p.poolAddress ?? p.stakingPool ?? p.addr ?? p.address;
      const creator = p.creator ?? p.owner ?? p.deployer ?? p.admin;
      const nft = p.nft ?? p.nftAddress ?? p.collection ?? p.erc721;
      const rewardToken = p.rewardToken ?? p.reward_token ?? p.reward ?? p.erc20;
      if (!pool || !creator || !nft || !rewardToken) return null;
      return { ...p, pool, creator, nft, rewardToken };
    })
    .filter(Boolean);
}

// ✅ Try Supabase first
async function fetchFromSupabase(creator?: `0x${string}`) {
  // If supabaseAdmin isn't configured, it might throw — caller handles
  let q = supabaseAdmin.from("pools").select("pool, creator, nft, reward_token, chain_id, updated_at");
  if (creator) q = q.eq("creator", creator.toLowerCase());
  q = q.eq("chain_id", 8453);

  const { data, error } = await q.order("updated_at", { ascending: false }).limit(500);
  if (error) throw error;

  const pools = (data ?? []).map((r: any) => ({
    pool: r.pool,
    creator: r.creator,
    nft: r.nft,
    rewardToken: r.reward_token,
    chainId: r.chain_id,
    updated_at: r.updated_at,
  }));

  return normalizePools(pools);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const creatorParam = searchParams.get("creator");
  const creator =
    creatorParam && isAddress(creatorParam) ? (creatorParam as `0x${string}`) : undefined;

  if (creatorParam && !creator) {
    return NextResponse.json({ ok: false, error: `Invalid creator address: ${creatorParam}` }, { status: 400 });
  }

  const addressesParam = searchParams.get("addresses");
  const addresses = parseAddressesParam(addressesParam);
  if (addressesParam && !addresses) {
    return NextResponse.json(
      { ok: false, error: `Invalid addresses (must be comma-separated 0x...): ${addressesParam}` },
      { status: 400 },
    );
  }

  const windowParam = searchParams.get("window");
  const stepParam = searchParams.get("step");
  const throttleParam = searchParams.get("throttle");

  const windowBlocks = safeBigInt(windowParam);
  const stepBlocks = safeBigInt(stepParam);
  const throttleMs = safeNumber(throttleParam);

  if (windowParam && windowBlocks === undefined) {
    return NextResponse.json({ ok: false, error: `Invalid window (must be integer blocks): ${windowParam}` }, { status: 400 });
  }
  if (stepParam && stepBlocks === undefined) {
    return NextResponse.json({ ok: false, error: `Invalid step (must be integer blocks): ${stepParam}` }, { status: 400 });
  }
  if (throttleParam && throttleMs === undefined) {
    return NextResponse.json({ ok: false, error: `Invalid throttle (must be integer ms): ${throttleParam}` }, { status: 400 });
  }

  const TTL_MS = 35_000;

  const key = makeKey({
    creator,
    addresses: addressesParam,
    window: windowParam,
    step: stepParam,
    throttle: throttleParam,
  });

  const cached = POOLS_CACHE.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    const res = NextResponse.json({ ok: true, pools: cached.value });
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=10");
    res.headers.set("X-Pools-Cache", "HIT");
    return res;
  }

  const inflight = POOLS_INFLIGHT.get(key);
  if (inflight) {
    try {
      const pools = await inflight;
      const res = NextResponse.json({ ok: true, pools });
      res.headers.set("Cache-Control", "public, max-age=0, s-maxage=10");
      res.headers.set("X-Pools-Cache", "JOIN");
      return res;
    } catch (e: any) {
      const res = NextResponse.json({ ok: false, error: e?.message ?? "Failed to load pools" }, { status: 500 });
      res.headers.set("X-Pools-Cache", "JOIN_ERR");
      return res;
    }
  }

  const opts =
    windowBlocks !== undefined || stepBlocks !== undefined || throttleMs !== undefined
      ? {
          ...(windowBlocks !== undefined ? { windowBlocks } : {}),
          ...(stepBlocks !== undefined ? { stepBlocks } : {}),
          ...(throttleMs !== undefined ? { throttleMs } : {}),
        }
      : undefined;

  const p = (async () => {
    // If caller provided addresses, you can support it later.
    // For now, ignore addresses and rely on DB / scan.

    // 1) SUPABASE FIRST (fast)
    try {
      const fromDb = await fetchFromSupabase(creator);
      if (fromDb.length > 0) return fromDb;
    } catch (e) {
      // If DB not configured or errors, fall back to scan
      console.warn("[/api/pools] supabase read failed (falling back to scan)", (e as any)?.message ?? e);
    }

    // 2) FALLBACK: chain scan (slow)
    if (creator) {
      return opts ? await fetchPoolsByCreator(creator, opts) : await fetchPoolsByCreator(creator);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return opts ? await fetchPoolsByCreator(undefined as any, opts) : await fetchPoolsByCreator(undefined as any);
  })();

  POOLS_INFLIGHT.set(key, p);

  try {
    const raw = await p;
    const pools = normalizePools(raw);

    POOLS_CACHE.set(key, { value: pools, expiresAt: Date.now() + TTL_MS });

    if (POOLS_CACHE.size > 250) {
      const t = Date.now();
      for (const [k, v] of POOLS_CACHE) if (v.expiresAt <= t) POOLS_CACHE.delete(k);
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

    return NextResponse.json({ ok: false, error: e?.message ?? "Failed to load pools" }, { status: 500 });
  } finally {
    POOLS_INFLIGHT.delete(key);
  }
}
