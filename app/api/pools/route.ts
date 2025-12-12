// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";

export const runtime = "nodejs"; // IMPORTANT: avoid Edge issues with RPC/log scanning
export const dynamic = "force-dynamic"; // ensure no weird caching behavior while debugging

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const creator = searchParams.get("creator") as `0x${string}` | null;

  // optional tuning knobs
  const window = searchParams.get("window"); // blocks, e.g. 500000
  const windowBlocks = window ? BigInt(window) : undefined;

  try {
    const pools = await fetchPoolsByCreator(creator ?? undefined, {
      windowBlocks,
    });
    return NextResponse.json({ ok: true, pools });
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
  }
}
