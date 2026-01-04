import { NextResponse } from "next/server";
import { createPublicClient, http, type Address } from "viem";
import { base } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Hard-code the “222B4” Basebots contract
const CONTRACT: Address = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4";

// Minimal ABI (avoids pulling in huge ABI + typing conflicts)
const ABI = [
  {
    name: "totalMinted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

function rpcList(): string[] {
  const raw = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const envList = raw
    ? raw.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // safe public fallbacks (only used if env missing)
  const fallbacks = ["https://mainnet.base.org", "https://base.publicnode.com"];

  return Array.from(new Set([...envList, ...fallbacks]));
}

function safeB64ToUtf8(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

// Extract raw SVG from tokenURI JSON data URL
function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri) return null;

  // data:application/json;base64,<...>
  if (tokenUri.startsWith("data:application/json;base64,")) {
    const b64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = safeB64ToUtf8(b64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      // preferred: image_data raw svg
      if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
        return meta.image_data;
      }

      // sometimes: image is svg data url
      if (typeof meta?.image === "string") {
        const img: string = meta.image;

        if (img.startsWith("data:image/svg+xml;base64,")) {
          const svgB64 = img.slice("data:image/svg+xml;base64,".length);
          const svg = safeB64ToUtf8(svgB64);
          return svg.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg.includes("<svg") ? svg : null;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

function svgToDataUrl(svg: string) {
  // Ensure xmlns exists
  let s = svg.includes('xmlns="http://www.w3.org/2000/svg"')
    ? svg
    : svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');

  // Keep scaling consistent
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let t: NodeJS.Timeout | null = null;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (t) clearTimeout(t);
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));

  const rpcs = rpcList();
  if (!rpcs.length) {
    return NextResponse.json(
      { ok: false, error: "Base RPC temporarily unavailable" },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  // Try each RPC until one works (but do NOT reveal which)
  for (const rpcUrl of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpcUrl, { timeout: 12_000, batch: false }),
      });

      // ✅ fast + deterministic: totalMinted -> last N ids
      const totalMinted = await withTimeout(
        pc.readContract({
          address: CONTRACT,
          abi: ABI,
          functionName: "totalMinted",
        }),
        14_000
      );

      const total = Number(totalMinted);
      if (!Number.isFinite(total) || total <= 0) {
        return NextResponse.json(
          { ok: true, cards: [] },
          { headers: { "cache-control": "no-store" } }
        );
      }

      const tokenIds = Array.from({ length: n }, (_, i) => BigInt(total - i)).filter((x) => x > 0n);

      // multicall tokenURI
      const urisRes = await withTimeout(
        pc.multicall({
          allowFailure: true,
          contracts: tokenIds.map((tid) => ({
            address: CONTRACT,
            abi: ABI,
            functionName: "tokenURI",
            args: [tid],
          })),
        }),
        14_000
      );

      const cards = tokenIds.map((tid, i) => {
        const uri = (urisRes as any)[i]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        return {
          tokenId: tid.toString(),
          image: svg ? svgToDataUrl(svg) : null,
        };
      });

      return NextResponse.json(
        { ok: true, cards },
        { headers: { "cache-control": "no-store" } }
      );
    } catch {
      // try next RPC silently
    }
  }

  // ✅ Never include rpcUrl or rpcsTried (no leaking)
  return NextResponse.json(
    { ok: false, error: "Base RPC temporarily unavailable" },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
