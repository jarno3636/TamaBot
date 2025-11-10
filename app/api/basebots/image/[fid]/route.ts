// app/api/basebots/image/[fid]/route.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

// Run on Node (sharp won't work on edge)
export const runtime = "nodejs";

// Cache at the CDN but compute dynamically per request
export const revalidate = 300;          // 5 min
export const dynamic = "force-dynamic"; // don't try to pre-render at build

// Decode a tokenURI like: data:application/json;base64,<B64>
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

export async function GET(
  _req: NextRequest,
  context: { params: { fid: string } }
) {
  const fidStr = context?.params?.fid;
  const fidNum = Number(fidStr);
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
    const imageField = meta?.image as string | undefined;

    if (!imageField) {
      return NextResponse.json({ error: "no image" }, { status: 404 });
    }

    // If the contract returns an inline SVG (data URL), render to PNG
    if (imageField.startsWith("data:image/svg+xml")) {
      const base64 = imageField.split(",")[1] || "";
      const svgRaw = Buffer.from(base64, "base64").toString("utf8");
      if (!svgRaw) throw new Error("bad svg");

      const png = await sharp(Buffer.from(svgRaw))
        .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();

      return new NextResponse(png, {
        status: 200,
        headers: {
          "content-type": "image/png",
          "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    }

    // If the contract ever returns an https image, proxy it (optional)
    if (/^https?:\/\//i.test(imageField)) {
      const r = await fetch(imageField);
      if (!r.ok) throw new Error("fetch image failed");
      const buf = Buffer.from(await r.arrayBuffer());
      const ct = r.headers.get("content-type") || "image/png";
      return new NextResponse(buf, {
        headers: {
          "content-type": ct,
          "cache-control": "public, max-age=300, s-maxage=300, stale-while-revalidate=86400",
        },
      });
    }

    return NextResponse.json({ error: "unsupported image format" }, { status: 415 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
