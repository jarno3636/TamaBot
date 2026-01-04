import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { zeroAddress } from "viem";
import { BASEBOTS } from "@/lib/abi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  if (tokenUri.startsWith("data:application/json;base64,")) {
    const b64 = tokenUri.slice("data:application/json;base64,".length);
    const jsonStr = safeB64ToUtf8(b64);
    if (!jsonStr) return null;

    try {
      const meta = JSON.parse(jsonStr);

      if (typeof meta?.image_data === "string" && meta.image_data.trim().includes("<svg")) {
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

function svgToDataUrl(svg: string) {
  let s = svg;
  if (!s.includes('xmlns="http://www.w3.org/2000/svg"')) {
    s = s.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  if (!/preserveAspectRatio=/.test(s)) {
    s = s.replace("<svg", '<svg preserveAspectRatio="xMidYMid meet"');
  }
  return `data:image/svg+xml;utf8,${encodeURIComponent(s)}`;
}

function getRpcList() {
  const env = (process.env.BASE_RPC_URLS || "").trim();
  const list = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : [process.env.BASE_RPC_URL || "", "https://mainnet.base.org", "https://base.publicnode.com"]
        .map((s) => s.trim())
        .filter(Boolean);

  return Array.from(new Set(list));
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function tryWith<T>(fn: () => Promise<T>, tries = 2) {
  let last: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      await sleep(250 + i * 350);
    }
  }
  throw last;
}

export async function GET(req: Request) {
  const started = Date.now();
  const BUDGET_MS = 9_000; // ✅ hard cap so request returns (Vercel function won’t hang)

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

  // ✅ scanning settings: fewer RPC calls, larger window per call
  const CHUNK = 35_000n;
  const MAX_LOOPS = 20;

  let lastErr: any = null;

  for (const rpcUrl of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpcUrl, { timeout: 18_000, batch: false }),
      });

      const latest = await tryWith(() => pc.getBlockNumber(), 2);

      let toBlock = latest;
      let fromBlock = toBlock > CHUNK ? toBlock - CHUNK : 0n;
      if (fromBlock < deployBlock) fromBlock = deployBlock;

      const found: Array<{ tokenId: bigint; blockNumber: bigint; logIndex: number }> = [];

      for (let loop = 0; loop < MAX_LOOPS && found.length < n; loop++) {
        // ✅ time budget check
        if (Date.now() - started > BUDGET_MS) break;

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

      // ✅ If we timed out before finding anything, return quickly (don’t hang)
      if (tokenIds.length === 0) {
        return NextResponse.json(
          {
            ok: true,
            contract,
            rpcUrl,
            latest: latest.toString(),
            cards: [],
            partial: true,
            note: "No mints found within time budget. Try Refresh again.",
          },
          { headers: { "cache-control": "no-store" } }
        );
      }

      // tokenURI calls (fast)
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
        {
          ok: true,
          contract,
          rpcUrl,
          latest: latest.toString(),
          cards,
          partial: cards.length < n || Date.now() - started > BUDGET_MS,
        },
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
      hint: "This is usually RPC eth_getLogs rate-limiting. For reliability, set BASE_RPC_URLS to include Alchemy/QuickNode.",
      contract: BASEBOTS.address,
      rpcsTried: rpcs,
    },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
