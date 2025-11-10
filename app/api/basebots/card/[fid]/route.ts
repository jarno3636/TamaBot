// app/api/basebots/card/[fid]/route.ts
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 300; // 5m CDN

function decodeTokenJSON(uri: string): any | null {
  if (!uri?.startsWith?.("data:application/json;base64,")) return null;
  try {
    const b64 = uri.split(",")[1] || "";
    const jsonStr = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * NOTE: Next 15’s validator is picky about the 2nd arg’s TS type.
 * Use a permissive `any` so builds don’t fail while keeping the expected shape.
 */
export async function GET(_req: Request, ctx: any) {
  const fidStr = String(ctx?.params?.fid ?? "");
  const fidNum = Number(fidStr);
  if (!Number.isInteger(fidNum) || fidNum <= 0) {
    return NextResponse.json({ error: "bad fid" }, { status: 400 });
  }

  const rpcUrl =
    process.env.NEXT_PUBLIC_BASE_RPC ||
    process.env.RPC_URL ||
    "https://mainnet.base.org";

  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

  try {
    const tokenURI = await client.readContract({
      address: BASEBOTS.address as `0x${string}`,
      abi: BASEBOTS.abi,
      functionName: "tokenURI",
      args: [BigInt(fidNum)],
    });

    if (typeof tokenURI !== "string") throw new Error("no tokenURI");
    const meta = decodeTokenJSON(tokenURI);
    const imageField: string | undefined = meta?.image;
    if (!imageField) {
      return NextResponse.json({ error: "no image" }, { status: 404 });
    }

    // Twitter card target size
    const TW_W = 1200;
    const TW_H = 675;
    const bg = { r: 10, g: 11, b: 18, alpha: 1 as const };

    // Helper: letterbox any buffer into 1200x675
    async function letterboxToCard(buf: Buffer) {
      const fitted = await sharp(buf).resize(TW_W, TW_H, { fit: "inside", background: bg }).toBuffer();
      return sharp({ create: { width: TW_W, height: TW_H, channels: 4, background: bg } })
        .composite([{ input: fitted, gravity: "center" }])
        .jpeg({ quality: 92 })
        .toBuffer();
    }

    // Inline SVG → square PNG → letterbox to 1200x675
    if (imageField.startsWith("data:image/svg+xml")) {
      const base64 = imageField.split(",")[1] || "";
      const svgRaw = Buffer.from(base64, "base64");
      const squarePng = await sharp(svgRaw)
        .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      const finalCard = await letterboxToCard(squarePng);
      return new NextResponse(finalCard, {
        headers: {
          "content-type": "image/jpeg",
          "cache-control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    }

    // Remote image → letterbox to 1200x675
    if (/^https?:\/\//i.test(imageField)) {
      const r = await fetch(imageField);
      if (!r.ok) throw new Error("fetch image failed");
      const buf = Buffer.from(await r.arrayBuffer());
      const finalCard = await letterboxToCard(buf);
      return new NextResponse(finalCard, {
        headers: {
          "content-type": "image/jpeg",
          "cache-control":
            "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    }

    return NextResponse.json({ error: "unsupported image format" }, { status: 415 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
