import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────── */
/* Seed pools (instant load, merged with DB + chain scan)         */
/* ────────────────────────────────────────────────────────────── */
const SEED_POOLS = [
  {
    pool: "0x78928e181bdc23c79cb471a8ea31ec9073dfaf0f",
    creator: "0xb37c91305f50e3cdb0d7a048a18d7536c9524f58",
    nft: "0x92e29025fd6badd17c3005084fe8c43d928222b4",
    rewardToken: "0xc45d7c40c9c65af95d33da5921f787d5cfd3ffcf",
    chainId: 8453,
  },
  {
    pool: "0x7fe34829f411ccf0ed67748e5143c92f633f6d74",
    creator: "0xb37c91305f50e3cdb0d7a048a18d7536c9524f58",
    nft: "0x92e29025fd6badd17c3005084fe8c43d928222b4",
    rewardToken: "0xc45d7c40c9c65af95d33da5921f787d5cfd3ffcf",
    chainId: 8453,
  },
];

/* ────────────────────────────────────────────────────────────── */
/* Cache + single-flight                                         */
/* ────────────────────────────────────────────────────────────── */
type CacheEntry = { expiresAt: number; value: any };
const g = globalThis as any;

const POOLS_CACHE: Map<string, CacheEntry> =
  g.__POOLS_CACHE__ ?? (g.__POOLS_CACHE__ = new Map());

const POOLS_INFLIGHT: Map<string, Promise<any>> =
  g.__POOLS_INFLIGHT__ ?? (g.__POOLS_INFLIGHT__ = new Map());

/* ────────────────────────────────────────────────────────────── */
/* Helpers                                                       */
/* ────────────────────────────────────────────────────────────── */
function normalizePools(pools: any[]) {
  const map = new Map<string, any>();

  for (const p of pools) {
    if (!p?.pool) continue;
    map.set(p.pool.toLowerCase(), {
      ...p,
      pool: p.pool.toLowerCase(),
      creator: p.creator?.toLowerCase(),
      nft: p.nft?.toLowerCase(),
      rewardToken: p.rewardToken?.toLowerCase(),
    });
  }

  return Array.from(map.values());
}

async function fetchFromSupabase(creator?: `0x${string}`) {
  let q = supabaseAdmin
    .from("pools")
    .select("pool, creator, nft, reward_token, chain_id, updated_at")
    .eq("chain_id", 8453);

  if (creator) q = q.eq("creator", creator.toLowerCase());

  const { data, error } = await q.limit(500);
  if (error) throw error;

  return (data ?? []).map((r) => ({
    pool: r.pool,
    creator: r.creator,
    nft: r.nft,
    rewardToken: r.reward_token,
    chainId: r.chain_id,
    updated_at: r.updated_at,
  }));
}

/* ────────────────────────────────────────────────────────────── */
/* GET                                                           */
/* ────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorParam = searchParams.get("creator");

  const creator =
    creatorParam && isAddress(creatorParam)
      ? (creatorParam.toLowerCase() as `0x${string}`)
      : undefined;

  const cacheKey = `creator=${creator ?? "all"}`;
  const now = Date.now();

  const cached = POOLS_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return NextResponse.json({ ok: true, pools: cached.value });
  }

  if (POOLS_INFLIGHT.has(cacheKey)) {
    const pools = await POOLS_INFLIGHT.get(cacheKey)!;
    return NextResponse.json({ ok: true, pools });
  }

  const job = (async () => {
    const results: any[] = [];

    /* 1️⃣ Seed pools (instant) */
    results.push(
      ...SEED_POOLS.filter((p) =>
        creator ? p.creator === creator : true
      )
    );

    /* 2️⃣ Supabase */
    try {
      const dbPools = await fetchFromSupabase(creator);
      results.push(...dbPools);
    } catch (e) {
      console.warn("[pools] supabase skipped");
    }

    /* 3️⃣ Chain scan fallback */
    if (results.length === 0) {
      const scanned = creator
        ? await fetchPoolsByCreator(creator)
        : await fetchPoolsByCreator(undefined as any);
      results.push(...scanned);
    }

    const normalized = normalizePools(results);

    POOLS_CACHE.set(cacheKey, {
      value: normalized,
      expiresAt: Date.now() + 30_000,
    });

    return normalized;
  })();

  POOLS_INFLIGHT.set(cacheKey, job);

  try {
    const pools = await job;
    return NextResponse.json({ ok: true, pools });
  } finally {
    POOLS_INFLIGHT.delete(cacheKey);
  }
}
