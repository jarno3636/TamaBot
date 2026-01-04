import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/**
 * HARD-CODED Basebots contract (222B4)
 */
const CONTRACT = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as const;

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
    inputs: [{ type: "uint256", name: "tokenId" }],
    outputs: [{ type: "string" }],
  },
] as const;

function extractSvg(uri: string): string | null {
  if (!uri.startsWith("data:application/json;base64,")) return null;
  try {
    const json = JSON.parse(
      Buffer.from(uri.split(",")[1], "base64").toString("utf8")
    );
    if (typeof json.image_data === "string") return json.image_data;
    if (typeof json.image === "string") return json.image;
    return null;
  } catch {
    return null;
  }
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));

  try {
    const pc = createPublicClient({
      chain: base,
      transport: http(
        process.env.BASEBOTS_RPC_URLS?.split(",")[0] ||
          "https://mainnet.base.org"
      ),
    });

    const total = await pc.readContract({
      address: CONTRACT,
      abi: ABI,
      functionName: "totalMinted",
    });

    const totalNum = Number(total);
    const ids = Array.from({ length: n })
      .map((_, i) => BigInt(totalNum - i))
      .filter((v) => v > 0n);

    const uris = await pc.multicall({
      contracts: ids.map((id) => ({
        address: CONTRACT,
        abi: ABI,
        functionName: "tokenURI",
        args: [id],
      })),
    });

    const cards = ids.map((id, i) => {
      const uri = uris[i]?.result as string | undefined;
      const svg = uri ? extractSvg(uri) : null;
      return {
        tokenId: id.toString(),
        image: svg ? svgToDataUrl(svg) : null,
      };
    });

    return NextResponse.json({ ok: true, cards });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Base RPC temporarily unavailable" },
      { status: 500 }
    );
  }
}
