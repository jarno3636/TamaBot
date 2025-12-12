// app/api/pools/route.ts
import { NextResponse } from "next/server";
import { isAddress } from "viem";
import { fetchPoolsByCreator } from "@/lib/fetchFactoryPools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const creatorParam = searchParams.get("creator");
  const creator =
    creatorParam && isAddress(creatorParam)
      ? (creatorParam as `0x${string}`)
      : undefined;

  // If they passed something invalid (like 0xYOURADDRESS) return a clean 400
  if (creatorParam && !creator) {
    return NextResponse.json(
      { ok: false, error: `Invalid creator address: ${creatorParam}` },
      { status: 400 },
    );
  }

  // Optional tuning knobs
  const window = searchParams.get("window"); // blocks
  const step = searchParams.get("step"); // blocks
  const throttle = searchParams.get("throttle"); // ms

  const windowBlocks = window ? BigInt(window) : undefined;
  const stepBlocks = step ? BigInt(step) : undefined;
  const throttleMs = throttle ? Number(throttle) : undefined;

  try {
    const pools = await fetchPoolsByCreator(creator, {
      windowBlocks,
      stepBlocks,
      throttleMs,
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
