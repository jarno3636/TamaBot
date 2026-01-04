import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ────────────────────────────────────────────────────────────── */
/* Seed pools                                                     */
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
].map((p) => ({
  ...p,
  pool: p.pool.toLowerCase(),
  creator: p.creator.toLowerCase(),
  nft: p.nft.toLowerCase(),
  rewardToken: p.rewardToken.toLowerCase(),
}));

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

  for (const p of pools ?? []) {
    if (!p?.pool) continue;

    const pool = String(p.pool).toLowerCase();
    const creator = p.creator ? String(p.creator).toLowerCase() : undefined;
    const nft = p.nft ? String(p.nft).toLowerCase() : undefined;
    const rewardToken = p.rewardToken ? String(p.rewardToken).toLowerCase() : undefined;

    if (!pool || !creator || !nft || !rewardToken) continue;

    // ✅ FIX: wrap isAddress so .every() doesn’t pass index as options
    if (![pool, creator, nft, rewardToken].every((a) => isAddress(a))) continue;

    map.set(pool, {
      ...p,
      pool,
      creator,
      nft,
      rewardToken,
      chainId: Number(p.chainId ?? (p as any).chain_id ?? 8453),
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

  const { data, error } = await q.order("updated_at", { ascending: false }).limit(500);
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

async function upsertToSupabaseBestEffort(pools: any[]) {
  try {
    const normalized = normalizePools(pools).filter((p) => (p.chainId ?? 8453) === 8453);
    if (normalized.length === 0) return;

    const rows = normalized.map((p) => ({
      pool: p.pool,
      creator: p.creator,
      nft: p.nft,
      reward_token: p.rewardToken,
      chain_id: 8453,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin.from("pools").upsert(rows, { onConflict: "pool" });
    if (error) console.warn("[/api/pools] upsert failed:", error.message ?? error);
  } catch (e: any) {
    console.warn("[/api/pools] upsert exception:", e?.message ?? e);
  }
}

/* ────────────────────────────────────────────────────────────── */
/* GET                                                           */
/* ────────────────────────────────────────────────────────────── */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creatorParam = searchParams.get("creator");
  const refreshParam = searchParams.get("refresh");

  const creator =
    creatorParam && isAddress(creatorParam)
      ? (creatorParam.toLowerCase() as `0x${string}`)
      : undefined;

  if (creatorParam && !creator) {
    return NextResponse.json(
      { ok: false, error: `Invalid creator address: ${creatorParam}` },
      { status: 400 }
    );
  }

  const forceScan = refreshParam === "1" || refreshParam === "true";
  const cacheKey = `creator=${creator ?? "all"}`;
  const now = Date.now();

  if (!forceScan) {
    const cached = POOLS_CACHE.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      const res = NextResponse.json({ ok: true, pools: cached.value });
      res.headers.set("X-Pools-Cache", "HIT");
      return res;
    }

    const inflight = POOLS_INFLIGHT.get(cacheKey);
    if (inflight) {
      const pools = await inflight;
      const res = NextResponse.json({ ok: true, pools });
      res.headers.set("X-Pools-Cache", "JOIN");
      return res;
    }
  }

  const job = (async () => {
    const results: any[] = [];

    // 1) Seed pools
    results.push(...SEED_POOLS.filter((p) => (creator ? p.creator === creator : true)));

    // 2) Supabase
    try {
      const dbPools = await fetchFromSupabase(creator);
      results.push(...dbPools);
    } catch {
      console.warn("[/api/pools] supabase read failed; continuing");
    }

    // 3) Chain scan on refresh (or if nothing found)
    if (forceScan || results.length === 0) {
      const scanned = creator
        ? await fetchPoolsByCreator(creator)
        : // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await fetchPoolsByCreator(undefined as any);

      results.push(...scanned);

      // persist
      void upsertToSupabaseBestEffort([...SEED_POOLS, ...scanned]);
    } else {
      void upsertToSupabaseBestEffort(SEED_POOLS);
    }

    const normalized = normalizePools(results);

    POOLS_CACHE.set(cacheKey, {
      value: normalized,
      expiresAt: Date.now() + 30_000,
    });

    return normalized;
  })();

  if (!forceScan) POOLS_INFLIGHT.set(cacheKey, job);

  try {
    const pools = await job;
    const res = NextResponse.json({ ok: true, pools });
    res.headers.set("X-Pools-Cache", forceScan ? "BYPASS" : "MISS");
    res.headers.set("Cache-Control", "no-store");
    return res;
  } finally {
    if (!forceScan) POOLS_INFLIGHT.delete(cacheKey);
  }
}
