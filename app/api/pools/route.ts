// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creator = searchParams.get("creator") as `0x${string}` | null;

  try {
    const pools = await fetchPoolsByCreator(creator ?? undefined);
    return NextResponse.json({ ok: true, pools });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load pools" },
      { status: 500 }
    );
  }
}
