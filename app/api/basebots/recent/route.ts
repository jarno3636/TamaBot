import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { zeroAddress } from "viem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ✅ HARD-CODED CONTRACT (the “224b contract”)
 * Basebots: 0x92E2...224B
 */
const BASEBOTS_RECENT_CONTRACT = "0x92E29025fd6bAdD17c3005084fe8C43D928222B4" as const;

const MINTED_EVENT = {
  type: "event",
  name: "Minted",
  inputs: [
    { indexed: true, name: "minter", type: "address" },
    { indexed: true, name: "fid", type: "uint256" },
  ],
} as const;

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

function getRpcList(): string[] {
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();
  const list = env
    ? env.split(",").map((s) => s.trim()).filter(Boolean)
    : ["https://mainnet.base.org", "https://base.publicnode.com"];
  return Array.from(new Set(list));
}

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

      if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
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
  const b64 = Buffer.from(s, "utf8").toString("base64");
  return `data:image/svg+xml;base64,${b64}`;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
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

function safeErrorMessage() {
  // 🔒 Never leak RPC URLs or raw provider errors
  return "Base RPC temporarily unavailable";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const deployBlockRaw = searchParams.get("deployBlock");
  const deployBlock = BigInt(deployBlockRaw || "0");

  const contract = BASEBOTS_RECENT_CONTRACT;
  const rpcs = getRpcList();

  if (!rpcs.length) {
    return NextResponse.json(
      { ok: false, error: "No RPC configured. Set BASEBOTS_RPC_URLS." },
      { status: 500, headers: { "cache-control": "no-store" } }
    );
  }

  // Progressive scan windows (fast → bigger)
  const WINDOWS = [2_000n, 8_000n, 25_000n, 80_000n, 250_000n];

  for (const rpcUrl of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpcUrl, { timeout: 35_000, batch: false }),
      });

      const latest = await tryWith(() => pc.getBlockNumber(), 2);

      const clampFrom = (from: bigint) => {
        if (from < deployBlock) return deployBlock;
        return from;
      };

      // 1) Prefer Minted(fid) events (usually lighter)
      let ids: bigint[] = [];

      for (const win of WINDOWS) {
        const from0 = latest > win ? latest - win : 0n;
        const fromBlock = clampFrom(from0);

        const logs = await tryWith(
          () =>
            pc.getLogs({
              address: contract,
              event: MINTED_EVENT,
              fromBlock,
              toBlock: latest,
            }),
          2
        );

        logs.sort((a, b) => {
          if (a.blockNumber === b.blockNumber) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
          return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
        });

        for (const l of logs) {
          const fid = (l.args as any)?.fid as bigint | undefined;
          if (fid === undefined) continue;
          if (!ids.includes(fid)) ids.push(fid);
          if (ids.length >= n) break;
        }

        if (ids.length >= n) break;
      }

      // 2) Fallback: Transfer(from=0x0)
      if (ids.length < n) {
        for (const win of WINDOWS) {
          const from0 = latest > win ? latest - win : 0n;
          const fromBlock = clampFrom(from0);

          const logs = await tryWith(
            () =>
              pc.getLogs({
                address: contract,
                event: TRANSFER_EVENT,
                args: { from: zeroAddress },
                fromBlock,
                toBlock: latest,
              }),
            2
          );

          logs.sort((a, b) => {
            if (a.blockNumber === b.blockNumber) return (b.logIndex ?? 0) - (a.logIndex ?? 0);
            return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
          });

          for (const l of logs) {
            const tid = (l.args as any)?.tokenId as bigint | undefined;
            if (tid === undefined) continue;
            if (!ids.includes(tid)) ids.push(tid);
            if (ids.length >= n) break;
          }

          if (ids.length >= n) break;
        }
      }

      ids = ids.slice(0, n);

      if (ids.length === 0) {
        return NextResponse.json(
          { ok: true, contract, cards: [] },
          { headers: { "cache-control": "no-store" } }
        );
      }

      const urisRes = await tryWith(
        () =>
          pc.multicall({
            allowFailure: true,
            contracts: ids.map((tid) => ({
              address: contract,
              abi: ERC721_TOKENURI_ABI,
              functionName: "tokenURI",
              args: [tid],
            })),
          }),
        2
      );

      const cards = ids.map((tid, i) => {
        const uri = (urisRes as any)[i]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        const image = svg ? svgToDataUrl(svg) : null;
        return { tokenId: tid.toString(), image };
      });

      return NextResponse.json(
        { ok: true, contract, cards },
        { headers: { "cache-control": "no-store" } }
      );
    } catch {
      // try next RPC
    }
  }

  return NextResponse.json(
    { ok: false, error: safeErrorMessage(), contract: BASEBOTS_RECENT_CONTRACT },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
