// app/api/pools/upsert/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

type Body = {
  pool: string;
  creator: string;
  nft: string;
  rewardToken: string;
  chainId?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body.pool || !body.creator || !body.nft || !body.rewardToken) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    const row = {
      pool: body.pool.toLowerCase(),
      creator: body.creator.toLowerCase(),
      nft: body.nft.toLowerCase(),
      reward_token: body.rewardToken.toLowerCase(),
      chain_id: body.chainId ?? 8453,
    };

    const { error } = await supabaseAdmin.from("pools").upsert(row, { onConflict: "pool" });
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Upsert failed" },
      { status: 500 }
    );
  }
}
