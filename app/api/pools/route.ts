// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";

export const runtime = "nodejs"; // avoid Edge issues with RPC/log scanning
export const dynamic = "force-dynamic"; // avoid caching while debugging

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // optional filter: only return pools created by this address
  const creator = searchParams.get("creator") as `0x${string}` | null;

  // optional: how far back to scan from latest block (in blocks)
  // e.g. /api/pools?window=500000 or /api/pools?window=1500000
  const window = searchParams.get("window");
  const windowBlocks =
    window && window.trim().length > 0 ? BigInt(window) : undefined;

  try {
    const pools = await fetchPoolsByCreator(creator ?? undefined, {
      windowBlocks,
    });
    return NextResponse.json({ ok: true, pools });
  } catch (e: any) {
    console.error("[/api/pools] error", {
      creator,
      window,
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
