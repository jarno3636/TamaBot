// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const creator = searchParams.get("creator") as `0x${string}` | null;

  const window = searchParams.get("window");
  const step = searchParams.get("step");
  const throttle = searchParams.get("throttle");

  try {
    const pools = await fetchPoolsByCreator(creator ?? undefined, {
      windowBlocks: window ? BigInt(window) : undefined,
      stepBlocks: step ? BigInt(step) : undefined,
      throttleMs: throttle ? Number(throttle) : undefined,
    });

    return NextResponse.json({ ok: true, pools });
  } catch (e: any) {
    console.error("[/api/pools] error", {
      creator,
      message: e?.message,
      cause: e?.cause?.message,
      stack: e?.stack,
    });

    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load pools" },
      { status: 500 },
    );
  }
}
