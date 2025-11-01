// app/api/pet/extras/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, encodeAbiParameters, http } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";

export const runtime = "edge";

const RPC = process.env.CHAIN_RPC_BASE || process.env.NEXT_PUBLIC_CHAIN_RPC_BASE || "https://mainnet.base.org";

// ---- helpers ----
function json(data: any, init?: number) { return NextResponse.json(data, { status: init || 200 }); }
function bad(msg: string, code = 400) { return NextResponse.json({ error: msg }, { status: code }); }

// Replace with your **real** signer. For now, throw so you won’t forget to wire it.
async function signScoreTyped(_msg: { fid: bigint; day: bigint; dss: bigint; deadline: bigint; nonce: bigint; }): Promise<`0x${string}`> {
  throw new Error("signScoreTyped not wired. Import your server EIP-712 signer here.");
}

// Dummy scorer (plug Neynar/Warpcast/etc)
async function computeDailyScore(fid: bigint): Promise<bigint> {
  return BigInt((Number(fid) * 1337) % 10000);
}

async function aiPersonaFromState(state: {
  id: number; level: number; xp: number; mood: number; hunger: number; energy: number; cleanliness: number; lastTick: number; fid: number;
}): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return "Your TamaBot awaits. (AI disabled)";
  // lightweight: no extra deps—call OpenAI REST
  const prompt = `You are TamaBot stylist. Given on-chain state:
${JSON.stringify(state)}
Write:
- 1 sentence persona tagline (fun, wholesome).
- 3 short care tips based on weak stats.
- 1 brag line to share on Farcaster.
Keep it under 420 chars total.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 220,
    }),
  });
  const j = await r.json().catch(() => ({}));
  return j?.choices?.[0]?.message?.content?.trim?.() || "Your TamaBot awaits.";
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "score" | "persona"
    const idStr = url.searchParams.get("id") || "";
    const fidStr = url.searchParams.get("fid") || "";

    const client = createPublicClient({ chain: base, transport: http(RPC) });

    if (action === "score") {
      if (!/^\d+$/.test(String(fidStr))) return bad("invalid fid");
      const now = Math.floor(Date.now() / 1000);
      const day = Math.floor(now / 86400);
      const deadline = now + 15 * 60;
      const nonce = day;

      const fid = BigInt(fidStr);
      const dss = await computeDailyScore(fid);

      const payload = encodeAbiParameters(
        [
          { name: "fid", type: "uint256" },
          { name: "day", type: "uint256" },
          { name: "dss", type: "uint64"  },
          { name: "deadline", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
        [fid, BigInt(day), dss, BigInt(deadline), BigInt(nonce)]
      );

      const signature = await signScoreTyped({ fid, day: BigInt(day), dss, deadline: BigInt(deadline), nonce: BigInt(nonce) });
      return json({ payload, signature });
    }

    if (action === "persona") {
      if (!/^\d+$/.test(String(idStr))) return bad("invalid id");
      const id = BigInt(idStr);
      const s = await client.readContract({
        address: TAMABOT_CORE.address,
        abi: TAMABOT_CORE.abi,
        functionName: "getState",
        args: [id],
      }) as any[];

      const [level, xp, mood, hunger, energy, cleanliness, lastTick, fid] = s || [];
      const data = {
        id: Number(id), level: Number(level), xp: Number(xp), mood: Number(mood),
        hunger: Number(hunger), energy: Number(energy), cleanliness: Number(cleanliness),
        lastTick: Number(lastTick), fid: Number(fid),
      };
      const text = await aiPersonaFromState(data);
      return new NextResponse(JSON.stringify({ text }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "s-maxage=900, stale-while-revalidate=3600" },
      });
    }

    return bad("missing or invalid action");
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
