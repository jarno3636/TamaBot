// app/api/basebots/recent/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs"; // important for reliability on Vercel
export const dynamic = "force-dynamic";

const MINTED_EVENT = {
  type: "event",
  name: "Minted",
  inputs: [
    { indexed: true, name: "minter", type: "address" },
    { indexed: true, name: "fid", type: "uint256" },
  ],
} as const;

const ERC721_TOKENURI_ABI = [
  {
    name: "tokenURI",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

function safeAtobNode(b64: string): string {
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri) return null;

  if (tokenUri.startsWith("data:application/json;base64,")) {
    const b64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = safeAtobNode(b64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      if (typeof meta?.image_data === "string" && meta.image_data.trim().startsWith("<svg")) {
        return meta.image_data;
      }

      if (typeof meta?.image === "string") {
        const img: string = meta.image;

        if (img.startsWith("data:image/svg+xml;base64,")) {
          const svgB64 = img.slice("data:image/svg+xml;base64,".length);
          const svg = safeAtobNode(svgB64);
          return svg?.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg?.includes("<svg") ? svg : null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  if (tokenUri.trim().startsWith("{")) {
    try {
      const meta = JSON.parse(tokenUri);
      if (typeof meta?.image_data === "string" && meta.image_data.trim().startsWith("<svg")) return meta.image_data;
      if (typeof meta?.image === "string" && meta.image.startsWith("data:image/svg+xml;base64,")) {
        const svgB64 = meta.image.slice("data:image/svg+xml;base64,".length);
        const svg = safeAtobNode(svgB64);
        return svg?.includes("<svg") ? svg : null;
      }
    } catch {
      return null;
    }
  }

  return null;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 3) {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 250 + i * 400));
    }
  }
  throw last;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Optional overrides
    const want = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4"))); // default 4
    const deployBlock = BigInt(searchParams.get("deployBlock") || "37969324");

    // IMPORTANT: server-side RPC (not NEXT_PUBLIC)
    // Set BASE_RPC_URL in Vercel env for best reliability.
    const rpcUrl = (process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org").trim();

    const pc = createPublicClient({
      chain: base,
      transport: http(rpcUrl, { timeout: 25_000 }),
    });

    const latest = await withRetry(() => pc.getBlockNumber(), 3);

    const CHUNK = 8_000n;
    let toBlock = latest;
    let fromBlock = toBlock > CHUNK ? toBlock - CHUNK : 0n;
    if (fromBlock < deployBlock) fromBlock = deployBlock;

    const found: Array<{ fid: bigint; blockNumber: bigint; logIndex: number }> = [];

    for (let tries = 0; tries < 25 && found.length < want; tries++) {
      const logs = await withRetry(
        () =>
          pc.getLogs({
            address: BASEBOTS.address,
            event: MINTED_EVENT,
            fromBlock,
            toBlock,
          }),
        3
      );

      const sorted = [...logs].sort((a, b) => {
        if (a.blockNumber === b.blockNumber) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
        return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
      });

      for (const l of sorted) {
        const fid = (l.args as any)?.fid as bigint | undefined;
        if (fid === undefined) continue;
        if (!found.some((x) => x.fid === fid)) {
          found.push({ fid, blockNumber: l.blockNumber!, logIndex: l.logIndex ?? 0 });
          if (found.length >= want) break;
        }
      }

      if (toBlock <= deployBlock) break;

      toBlock = fromBlock > 0n ? fromBlock - 1n : 0n;
      const nextFrom = toBlock > CHUNK ? toBlock - CHUNK : 0n;
      fromBlock = nextFrom < deployBlock ? deployBlock : nextFrom;

      if (toBlock < deployBlock) break;
    }

    const tokenIds = found
      .sort((a, b) => {
        if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
        return Number(b.blockNumber - a.blockNumber);
      })
      .slice(0, want)
      .map((x) => x.fid);

    if (tokenIds.length === 0) {
      return NextResponse.json(
        { ok: true, tokenIds: [], cards: [] },
        { headers: { "cache-control": "no-store" } }
      );
    }

    const urisRes = await withRetry(
      () =>
        pc.multicall({
          allowFailure: true,
          contracts: tokenIds.map((tid) => ({
            address: BASEBOTS.address,
            abi: ERC721_TOKENURI_ABI,
            functionName: "tokenURI",
            args: [tid],
          })),
        }),
      3
    );

    const cards = tokenIds.map((tid, i) => {
      const uri = (urisRes as any)[i]?.result as string | undefined;
      const svg = uri ? extractSvgFromTokenUri(uri) : null;
      return { tokenId: tid.toString(), svg };
    });

    return NextResponse.json(
      { ok: true, tokenIds: tokenIds.map((t) => t.toString()), cards, rpc: rpcUrl },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    const msg = e?.shortMessage || e?.message || "HTTP request failed.";
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }
}
