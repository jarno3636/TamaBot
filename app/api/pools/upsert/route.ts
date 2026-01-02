// app/api/pools/upsert/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  pool: string;
  creator: string;
  nft: string;
  rewardToken: string;
  chainId?: number;
};

function requireSecret(req: Request): string | null {
  const secret = process.env.SUPABASE_UPSERT_SECRET;
  if (!secret) return null; // no auth configured
  const got = req.headers.get("x-admin-secret");
  if (!got || got !== secret) return "Unauthorized";
  return null;
}

function normAddr(s: unknown): `0x${string}` | null {
  if (typeof s !== "string") return null;
  const v = s.trim();
  if (!isAddress(v)) return null;
  return v.toLowerCase() as `0x${string}`;
}

function normChainId(n: unknown): number {
  const allowed = new Set([8453]);
  const v = typeof n === "number" && Number.isFinite(n) ? Math.trunc(n) : 8453;
  return allowed.has(v) ? v : 8453;
}

function clearPoolsCacheBestEffort() {
  const g = globalThis as any;
  try {
    const cache: Map<string, any> | undefined = g.__POOLS_CACHE__;
    if (cache && typeof cache.clear === "function") cache.clear();
  } catch {
    // ignore
  }
}

export async function POST(req: Request) {
  try {
    const authErr = requireSecret(req);
    if (authErr) {
      return NextResponse.json({ ok: false, error: authErr }, { status: 401 });
    }

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const pool = normAddr(body.pool);
    const creator = normAddr(body.creator);
    const nft = normAddr(body.nft);
    const rewardToken = normAddr(body.rewardToken);

    if (!pool || !creator || !nft || !rewardToken) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid fields. Expected valid addresses for pool/creator/nft/rewardToken.",
        },
        { status: 400 },
      );
    }

    const chain_id = normChainId(body.chainId);

    const row = {
      pool,
      creator,
      nft,
      reward_token: rewardToken,
      chain_id,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin.from("pools").upsert(row, { onConflict: "pool" });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message ?? "Upsert failed" }, { status: 500 });
    }

    clearPoolsCacheBestEffort();

    const res = NextResponse.json({ ok: true });
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Upsert failed" }, { status: 500 });
  }
}
