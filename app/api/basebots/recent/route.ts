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

/* ───────────────── helpers ───────────────── */

function getRpcList(): string[] {
  // 🔒 Dedicated env var, Base only, never exposed
  const env = (process.env.BASEBOTS_RPC_URLS || "").trim();

  if (!env) {
    // hard fallback (still Base)
    return ["https://mainnet.base.org"];
  }

  return env
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

function safeB64ToUtf8(b64: string) {
  try {
    return Buffer.from(b64, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function extractSvgFromTokenUri(tokenUri: string): string | null {
  if (!tokenUri?.startsWith("data:application/json;base64,")) return null;

  const jsonStr = safeB64ToUtf8(
    tokenUri.slice("data:application/json;base64,".length)
  );
  if (!jsonStr) return null;

  try {
    const meta = JSON.parse(jsonStr);

    if (typeof meta?.image_data === "string" && meta.image_data.includes("<svg")) {
      return meta.image_data;
    }

    if (typeof meta?.image === "string") {
      if (meta.image.startsWith("data:image/svg+xml;base64,")) {
        return safeB64ToUtf8(
          meta.image.slice("data:image/svg+xml;base64,".length)
        );
      }
      if (meta.image.startsWith("data:image/svg+xml;utf8,")) {
        return decodeURIComponent(
          meta.image.slice("data:image/svg+xml;utf8,".length)
        );
      }
    }
  } catch {}

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

/* ───────────────── route ───────────────── */

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const n = Math.max(1, Math.min(8, Number(searchParams.get("n") || "4")));
  const deployBlock = BigInt(searchParams.get("deployBlock") || "0");
  const contract = BASEBOTS.address as `0x${string}`;

  const rpcs = getRpcList();
  let lastError: string | null = null;

  // fast-first scan windows
  const WINDOWS = [800n, 2_500n, 8_000n, 25_000n, 80_000n, 250_000n];

  for (const rpc of rpcs) {
    try {
      const pc = createPublicClient({
        chain: base,
        transport: http(rpc, {
          timeout: 35_000,
          batch: false,
        }),
      });

      const latest = await withTimeout(pc.getBlockNumber(), 12_000);

      const found: Array<{ fid: bigint; blockNumber: bigint; logIndex: number }> =
        [];

      for (const win of WINDOWS) {
        const from = latest > win ? latest - win : 0n;
        const fromBlock = from < deployBlock ? deployBlock : from;

        const logs = await withTimeout(
          pc.getLogs({
            address: contract,
            event: MINTED_EVENT,
            fromBlock,
            toBlock: latest,
          }),
          30_000
        );

        logs.sort((a, b) => {
          if (a.blockNumber === b.blockNumber)
            return (b.logIndex ?? 0) - (a.logIndex ?? 0);
          return Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n));
        });

        for (const l of logs) {
          const fid = (l.args as any)?.fid as bigint | undefined;
          if (!fid) continue;
          if (!found.some((x) => x.fid === fid)) {
            found.push({ fid, blockNumber: l.blockNumber!, logIndex: l.logIndex ?? 0 });
            if (found.length >= n) break;
          }
        }

        if (found.length >= n) break;
      }

      const tokenIds = found
        .sort((a, b) =>
          a.blockNumber === b.blockNumber
            ? b.logIndex - a.logIndex
            : Number(b.blockNumber - a.blockNumber)
        )
        .slice(0, n)
        .map((x) => x.fid);

      if (tokenIds.length === 0) {
        return NextResponse.json(
          { ok: true, cards: [] },
          { headers: { "cache-control": "no-store" } }
        );
      }

      const uris = await withTimeout(
        pc.multicall({
          allowFailure: true,
          contracts: tokenIds.map((fid) => ({
            address: contract,
            abi: ERC721_TOKENURI_ABI,
            functionName: "tokenURI",
            args: [fid],
          })),
        }),
        25_000
      );

      const cards = tokenIds.map((fid, i) => {
        const uri = (uris as any)[i]?.result as string | undefined;
        const svg = uri ? extractSvgFromTokenUri(uri) : null;
        return {
          tokenId: fid.toString(),
          image: svg ? svgToDataUrl(svg) : null,
        };
      });

      return NextResponse.json(
        { ok: true, cards },
        { headers: { "cache-control": "no-store" } }
      );
    } catch (e: any) {
      lastError = "Base RPC temporarily unavailable";
    }
  }

  return NextResponse.json(
    {
      ok: false,
      error: lastError || "Unable to fetch recent mints",
      hint: "Base mainnet RPC may be under load. Try again shortly.",
    },
    { status: 500, headers: { "cache-control": "no-store" } }
  );
}
