import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const revalidate = 300;          // 5m CDN
export const dynamic = "force-dynamic"; // compute per request

function decodeTokenJSON(uri: string): any | null {
  if (!uri?.startsWith?.("data:application/json;base64,")) return null;
  try {
    const b64 = uri.split(",")[1] || "";
    const jsonStr = Buffer.from(b64, "base64").toString("utf8");
    return JSON.parse(jsonStr);
  } catch { return null; }
}

export async function GET(_req: NextRequest, ctx: { params: { fid: string } }) {
  const fidNum = Number(ctx?.params?.fid);
  if (!Number.isInteger(fidNum) || fidNum <= 0) {
    return NextResponse.json({ error: "bad fid" }, { status: 400 });
  }

  const rpcUrl = process.env.RPC_URL || "https://mainnet.base.org";
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
    if (!imageField) return NextResponse.json({ error: "no image" }, { status: 404 });

    // Target canvas for Twitter cards
    const TW_W = 1200, TW_H = 675;

    // Inline SVG → render onto 1200x675 with transparent/black bars preserved
    if (imageField.startsWith("data:image/svg+xml")) {
      const b64 = imageField.split(",")[1] || "";
      const svg = Buffer.from(b64, "base64");
      // First, render square PNG from SVG
      const square = await sharp(svg)
        .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
      // Composite onto 1200x675 (letterbox)
      const card = await sharp({
        create: { width: TW_W, height: TW_H, channels: 4, background: { r: 10, g: 11, b: 18, alpha: 1 } },
      })
        .composite([{
          input: square,
          gravity: "center",
          // fit inside 1200x675
          // sharp’s composite doesn’t resize, so pre-resize:
        }])
        .jpeg({ quality: 92 })
        .toBuffer();

      // If the square is too large, pre-fit it:
      const fittedSquare = await sharp(square).resize(TW_W, TW_H, { fit: "inside" }).toBuffer();
      const finalCard = await sharp({
        create: { width: TW_W, height: TW_H, channels: 4, background: { r: 10, g: 11, b: 18, alpha: 1 } },
      }).composite([{ input: fittedSquare, gravity: "center" }])
        .jpeg({ quality: 92 })
        .toBuffer();

      return new NextResponse(finalCard, {
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    }

    // Remote image (rare): proxy & letterbox to 1200x675
    if (/^https?:\/\//i.test(imageField)) {
      const r = await fetch(imageField);
      if (!r.ok) throw new Error("fetch image failed");
      const buf = Buffer.from(await r.arrayBuffer());
      const fitted = await sharp(buf).resize(1200, 675, { fit: "inside", background: { r: 10, g: 11, b: 18, alpha: 1 } }).toBuffer();
      const finalCard = await sharp({
        create: { width: 1200, height: 675, channels: 4, background: { r: 10, g: 11, b: 18, alpha: 1 } },
      }).composite([{ input: fitted, gravity: "center" }]).jpeg({ quality: 92 }).toBuffer();

      return new NextResponse(finalCard, {
        headers: {
          "content-type": "image/jpeg",
          "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    }

    return NextResponse.json({ error: "unsupported image format" }, { status: 415 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
