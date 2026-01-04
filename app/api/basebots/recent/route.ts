import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
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

function safeB64ToUtf8(b64: string) {
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
    const jsonStr = safeB64ToUtf8(b64);
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
          const svg = safeB64ToUtf8(svgB64);
          return svg.includes("<svg") ? svg : null;
        }

        if (img.startsWith("data:image/svg+xml;utf8,")) {
          const svg = decodeURIComponent(img.slice("data:image/svg+xml;utf8,".length));
          return svg.includes("<svg") ? svg : null;
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  return null;
}

function getRpcList() {
  // Prefer a paid RPC here. This endpoint is often rate limited for logs.
  // You can set BASE_RPC_URLS="url1,url2,url3"
  const env = (process.env.BASE_RPC_URLS || "").trim();
  const list = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : [
        process.env.BASE_RPC_URL || "",
        "https://mainnet.base.org",
        "https://base.publicnode.com",
      ].map((s) => s.trim()).filter(Boolean);

  // de-dupe
  return Array.from(new Set(list));
}

async function tryWith<T>(fn: () => Promise<T>, tries = 3) {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await new Promise((r) => setTimeout(r, 250 + i * 350));
    }
  }
  throw last;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const deployBlock = BigInt(searchParams.get("deployBlock") || "0");

  const contract = BASEBOTS.address as `0x${string}`;
  const rpcs = getRpcList();

  if (!rpcs.length) {
    return NextResponse.json(
      { ok: false, error: "No RPC configured. Set BASE_RPC_URL or BASE_RPC_URLS." },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  // Smaller chunk = fewer RPC timeouts; more loops = more reliable.
  const CHUNK = 4_000n;
  const MAX_LOOPS = 35;

  let lastErr: any = null;

  for (const rpcUrl of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpcUrl, {
          timeout: 25_000,
          batch: false, // IMPORTANT: some RPCs choke on batch for multicall/logs
        }),
      });

      const latest = await tryWith(() => pc.getBlockNumber(), 2);

      let toBlock = latest;
      let fromBlock = toBlock > CHUNK ? toBlock - CHUNK : 0n;
      if (fromBlock < deployBlock) fromBlock = deployBlock;

      const found: Array<{ fid: bigint; blockNumber: bigint; logIndex: number }> = [];

      for (let loop = 0; loop < MAX_LOOPS && found.length < n; loop++) {
        const logs = await tryWith(
          () =>
            pc.getLogs({
              address: contract,
              event: MINTED_EVENT,
              fromBlock,
              toBlock,
            }),
          2
        );

        // newest first
        logs.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
          return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
        });

        for (const l of logs) {
          const fid = (l.args as any)?.fid as bigint | undefined;
          if (fid === undefined) continue;
          if (!found.some((x) => x.fid === fid)) {
            found.push({ fid, blockNumber: l.blockNumber!, logIndex: l.logIndex ?? 0 });
            if (found.length >= n) break;
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
        .slice(0, n)
        .map((x) => x.fid);

      // multicall tokenURI (no batch)
      const urisRes = await tryWith(
        () =>
          pc.multicall({
            allowFailure: true,
            contracts: tokenIds.map((tid) => ({
              address: contract,
              abi: ERC721_TOKENURI_ABI,
              functionName: "tokenURI",
              args: [tid],
            })),
          }),
        2
      );

      const cards = tokenIds.map((tid, i) => {
        const uri = (urisRes as any)[i]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        return { tokenId: tid.toString(), svg };
      });

      return NextResponse.json(
        {
          ok: true,
          contract,
          rpcUrl,
          latest: latest.toString(),
          cards,
        },
        { headers: { "cache-control": "no-store" } }
      );
    } catch (e: any) {
      lastErr = e;
      // try next rpc
    }
  }

  const msg = lastErr?.shortMessage || lastErr?.message || String(lastErr) || "Unknown error";
  return NextResponse.json(
    {
      ok: false,
      error: msg,
      hint: "This is usually an RPC eth_getLogs restriction/rate-limit. Set BASE_RPC_URLS to a better RPC (Alchemy/QuickNode).",
      contract: BASEBOTS.address,
      rpcsTried: rpcs,
    },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
