import { NextResponse } from "next/server";
import { createPublicClient, http, zeroAddress } from "viem";
import { base } from "viem/chains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTRACT = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as const;

const MINTED_EVENT = {
  type: "event",
  name: "Minted",
  inputs: [
    { indexed: true, name: "minter", type: "address" },
    { indexed: true, name: "fid", type: "uint256" },
  ],
} as const;

const TOKEN_URI_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ type: "string" }],
  },
] as const;

function getRpcs() {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const envList = env ? env.split(",").map(s => s.trim()) : [];
  return [...new Set([...envList, "https://mainnet.base.org", "https://base.publicnode.com"])];
}

function decodeB64(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString();
  } catch {
    return "";
  }
}

function extractSvg(tokenUri: string): string | null {
  if (!tokenUri.startsWith("data:application/json;base64,")) return null;

  const json = decodeB64(tokenUri.slice(29));
  if (!json) return null;

  try {
    const meta = JSON.parse(json);

    if (typeof meta.image === "string") {
      if (meta.image.startsWith("data:image/svg+xml;base64,")) {
        const svg = decodeB64(meta.image.slice(26));
        return svg.includes("<svg") ? svg : null;
      }
      if (meta.image.startsWith("data:image/svg+xml;utf8,")) {
        return decodeURIComponent(meta.image.slice(24));
      }
    }

    if (typeof meta.image_data === "string" && meta.image_data.includes("<svg")) {
      return meta.image_data;
    }
  } catch {}

  return null;
}

function svgToDataUrl(svg: string) {
  if (!svg.includes("xmlns=")) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));

  for (const rpc of getRpcs()) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpc, { timeout: 20_000 }),
      });

      const latest = await pc.getBlockNumber();

      const logs = await pc.getLogs({
        address: CONTRACT,
        event: MINTED_EVENT,
        fromBlock: latest - 50_000n,
        toBlock: latest,
      });

      logs.sort((a, b) =>
        Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n))
      );

      const fids = Array.from(
        new Set(logs.map(l => (l.args as any)?.fid as bigint))
      ).slice(0, n);

      const uris = await pc.multicall({
        allowFailure: true,
        contracts: fids.map(fid => ({
          address: CONTRACT,
          abi: TOKEN_URI_ABI,
          functionName: "tokenURI",
          args: [fid],
        })),
      });

      const cards = fids.map((fid, i) => {
        const uri = (uris[i] as any)?.result as string | undefined;
        const svg = uri ? extractSvg(uri) : null;
        return {
          tokenId: fid.toString(), // ← THIS IS THE FID
          image: svg ? svgToDataUrl(svg) : null,
        };
      });

      return NextResponse.json(
        { ok: true, contract: CONTRACT, cards },
        { headers: { "cache-control": "no-store" } }
      );
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { ok: false, error: "Base RPC temporarily unavailable" },
    { status: 503 }
  );
}
