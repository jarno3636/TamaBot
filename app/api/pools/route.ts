// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * In-memory cache to reduce RPC load + prevent 429s.
 * Note: This cache lives per server instance (fine for Vercel/Node; best-effort).
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
  // only allow digits to avoid BigInt("1e6") etc
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

function makeKey(params: {
  creator?: string;
  window?: string | null;
  step?: string | null;
  throttle?: string | null;
}) {
  // normalize creator for cache key consistency
  const c = params.creator ? params.creator.toLowerCase() : "";
  return [
    `creator=${c}`,
    `window=${params.window ?? ""}`,
    `step=${params.step ?? ""}`,
    `throttle=${params.throttle ?? ""}`,
  ].join("&");
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

  // Optional tuning knobs (validated)
  const windowParam = searchParams.get("window"); // blocks
  const stepParam = searchParams.get("step"); // blocks
  const throttleParam = searchParams.get("throttle"); // ms

  const windowBlocks = safeBigInt(windowParam);
  const stepBlocks = safeBigInt(stepParam);
  const throttleMs = safeNumber(throttleParam);

  // if they provided invalid numeric params, return 400 (helps debugging)
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
  // Short TTL prevents repeated RPC hits when users flip tabs / refresh
  const TTL_MS = 25_000; // 25s
  const key = makeKey({
    creator,
    window: windowParam,
    step: stepParam,
    throttle: throttleParam,
  });

  // Serve cache if fresh
  const cached = POOLS_CACHE.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    const res = NextResponse.json({ ok: true, pools: cached.value });
    // CDN hints (best-effort; still dynamic)
    res.headers.set("Cache-Control", "public, max-age=0, s-maxage=10");
    res.headers.set("X-Pools-Cache", "HIT");
    return res;
  }

  // Single-flight: if a fetch for this key is in progress, await it
  const inflight = POOLS_INFLIGHT.get(key);
  if (inflight) {
    try {
      const pools = await inflight;
      const res = NextResponse.json({ ok: true, pools });
      res.headers.set("Cache-Control", "public, max-age=0, s-maxage=10");
      res.headers.set("X-Pools-Cache", "JOIN");
      return res;
    } catch (e: any) {
      // fall through to normal error
      const res = NextResponse.json(
        { ok: false, error: e?.message ?? "Failed to load pools" },
        { status: 500 },
      );
      res.headers.set("X-Pools-Cache", "JOIN_ERR");
      return res;
    }
  }

  // Start fetch + register inflight
  const p = (async () => {
    return await fetchPoolsByCreator(creator, {
      windowBlocks,
      stepBlocks,
      throttleMs,
    });
  })();

  POOLS_INFLIGHT.set(key, p);

  try {
    const pools = await p;

    // Store cache
    POOLS_CACHE.set(key, {
      value: pools,
      expiresAt: Date.now() + TTL_MS,
    });

    // Housekeeping: prevent unbounded growth
    // (cheap cleanup: remove expired entries occasionally)
    if (POOLS_CACHE.size > 250) {
      const t = Date.now();
      for (const [k, v] of POOLS_CACHE) {
        if (v.expiresAt <= t) POOLS_CACHE.delete(k);
      }
      // still too big? prune oldest-ish (Map preserves insertion order)
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
