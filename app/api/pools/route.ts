// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const creator = searchParams.get("creator") as `0x${string}` | null;

  // If caller doesn't pass window, we choose:
  // - with creator: larger default window (likely still OK)
  // - without creator: smaller default window (prevents 500/timeouts)
  const windowParam = searchParams.get("window");
  const windowBlocks =
    windowParam && windowParam.trim().length > 0
      ? BigInt(windowParam)
      : creator
      ? 1_000_000n
      : 150_000n;

  try {
    const pools = await fetchPoolsByCreator(creator ?? undefined, { windowBlocks });
    return NextResponse.json({ ok: true, pools, windowBlocks: windowBlocks.toString() });
  } catch (e: any) {
    console.error("[/api/pools] error", {
      creator,
      windowBlocks: windowBlocks.toString(),
      message: e?.message,
      shortMessage: e?.shortMessage,
      name: e?.name,
      cause: (e as any)?.cause,
      stack: e?.stack,
    });

    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load pools" },
      { status: 500 },
    );
  }
}
