// app/api/basebots/recent/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { zeroAddress } from "viem";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ✅ Canonical mint signal for ERC721:
// Transfer(from = 0x0, to = someone, tokenId = minted id)
const TRANSFER_EVENT = {
  type: "event",
  name: "Transfer",
  inputs: [
    { indexed: true, name: "from", type: "address" },
    { indexed: true, name: "to", type: "address" },
    { indexed: true, name: "tokenId", type: "uint256" },
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

  // data:application/json;base64,<...>
  if (tokenUri.startsWith("data:application/json;base64,")) {
    const b64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = safeB64ToUtf8(b64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      // common: image_data contains raw <svg>
      if (typeof meta?.image_data === "string" && meta.image_data.trim().includes("<svg")) {
        return meta.image_data;
      }

      // meta.image can be svg data urls
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

  // If your contract ever returns raw JSON (not base64)
  if (tokenUri.trim().startsWith("{")) {
    try {
      const meta = JSON.parse(tokenUri);
      if (typeof meta?.image_data === "string" && meta.image_data.trim().includes("<svg")) return meta.image_data;

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

// Make it “image-like” + force it to scale correctly
function svgToDataUrl(svg: string) {
  let s = svg;

  // ensure xmlns exists
  if (!s.includes('xmlns="http://www.w3.org/2000/svg"')) {
    s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }

  // helpful scaling hints if missing
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }

  // Encode into a data URL
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

function getRpcList() {
  const env = (process.env.BASE_RPC_URLS || "").trim();
  const list = env
    ? env
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [process.env.BASE_RPC_URL || "", "https://mainnet.base.org", "https://base.publicnode.com"]
        .map((s) => s.trim())
        .filter(Boolean);

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

  // ✅ bigger scan window so you actually find 4 mints
  const CHUNK = 20_000n;
  const MAX_LOOPS = 60;

  let lastErr: any = null;

  for (const rpcUrl of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpcUrl, { timeout: 25_000, batch: false }),
      });

      const latest = await tryWith(() => pc.getBlockNumber(), 2);

      let toBlock = latest;
      let fromBlock = toBlock > CHUNK ? toBlock - CHUNK : 0n;
      if (fromBlock < deployBlock) fromBlock = deployBlock;

      const found: Array<{ tokenId: bigint; blockNumber: bigint; logIndex: number }> = [];

      for (let loop = 0; loop < MAX_LOOPS && found.length < n; loop++) {
        // ✅ pull only mints: Transfer(from=0x0)
        const logs = await tryWith(
          () =>
            pc.getLogs({
              address: contract,
              event: TRANSFER_EVENT,
              args: { from: zeroAddress },
              fromBlock,
              toBlock,
            }),
          2
        );

        logs.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
          return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
        });

        for (const l of logs) {
          const tokenId = (l.args as any)?.tokenId as bigint | undefined;
          if (tokenId === undefined) continue;

          if (!found.some((x) => x.tokenId === tokenId)) {
            found.push({ tokenId, blockNumber: l.blockNumber!, logIndex: l.logIndex ?? 0 });
            if (found.length >= n) break;
          }
        }

        if (toBlock <= deployBlock) break;

        toBlock = fromBlock > 0n ? fromBlock - 1n : 0n;
        const nextFrom = toBlock > CHUNK ? toBlock - CHUNK : 0n;
        fromBlock = nextFrom < deployBlock ? deployBlock : nextFrom;

        if (toBlock < deployBlock) break;
        if (toBlock === 0n && fromBlock === 0n) break;
      }

      const tokenIds = found
        .sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return b.logIndex - a.logIndex;
          return Number(b.blockNumber - a.blockNumber);
        })
        .slice(0, n)
        .map((x) => x.tokenId);

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
        const image = svg ? svgToDataUrl(svg) : null;
        return { tokenId: tid.toString(), image };
      });

      return NextResponse.json(
        { ok: true, contract, rpcUrl, latest: latest.toString(), cards },
        { headers: { "cache-control": "no-store" } }
      );
    } catch (e: any) {
      lastErr = e;
    }
  }

  const msg = lastErr?.shortMessage || lastErr?.message || String(lastErr) || "Unknown error";
  return NextResponse.json(
    {
      ok: false,
      error: msg,
      hint: "Often an RPC eth_getLogs rate-limit. Set BASE_RPC_URLS to Alchemy/QuickNode for reliability.",
      contract: BASEBOTS.address,
      rpcsTried: rpcs,
    },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
