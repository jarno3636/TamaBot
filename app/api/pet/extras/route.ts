// app/api/pet/extras/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, encodeAbiParameters, http } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import { hasSupabase, upsertPersona } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RPC =
  process.env.CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
  "https://mainnet.base.org";

// ---- helpers ----
function json(data: any, init?: number) {
  return NextResponse.json(data, { status: init || 200 });
}
function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

// Replace with your **real** signer later
async function signScoreTyped(_msg: {
  fid: bigint;
  day: bigint;
  dss: bigint;
  deadline: bigint;
  nonce: bigint;
}): Promise<`0x${string}`> {
  throw new Error("signScoreTyped not wired. Import your server EIP-712 signer here.");
}

// Dummy scorer (plug Neynar/Warpcast/etc)
async function computeDailyScore(fid: bigint): Promise<bigint> {
  return BigInt((Number(fid) * 1337) % 10000);
}

// === NEW: structured persona with name/label/bio ===
async function aiPersonaFromState(state: {
  id: number;
  level: number;
  xp: number;
  mood: number;
  hunger: number;
  energy: number;
  cleanliness: number;
  lastTick: number;
  fid: number;
}): Promise<{ name: string; label: string; bio: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { name: "Tama", label: "Auto", bio: "Your TamaBot awaits. (AI disabled)" };

  const prompt = `You are TamaBot stylist.
State: ${JSON.stringify(state)}
Return JSON with:
- "name": short unique-ish name (2–10 chars, no emojis/numbers)
- "label": 2–5 word vibe tag
- "bio": 1–2 sentences, <220 chars, wholesome, no hashtags
Tune tips by weakest of mood/hunger/energy/cleanliness.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.65,
      max_tokens: 240,
    }),
  });

  const j = await r.json().catch(() => ({}));
  const raw = j?.choices?.[0]?.message?.content?.trim?.() || "{}";
  try {
    const parsed = JSON.parse(raw);
    return {
      name: String(parsed.name || "Tama"),
      label: String(parsed.label || "Auto"),
      bio: String(parsed.bio || "A cheerful bot tuned to your vibe."),
    };
  } catch {
    return { name: "Tama", label: "Auto", bio: "A cheerful bot tuned to your vibe." };
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action"); // "score" | "persona"
    const idStr = url.searchParams.get("id") || "";
    const fidStr = url.searchParams.get("fid") || "";
    const doSave = (url.searchParams.get("save") ?? "1") !== "0"; // default save ON

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
          { name: "dss", type: "uint64" },
          { name: "deadline", type: "uint256" },
          { name: "nonce", type: "uint256" },
        ],
        [fid, BigInt(day), dss, BigInt(deadline), BigInt(nonce)]
      );

      const signature = await signScoreTyped({
        fid,
        day: BigInt(day),
        dss,
        deadline: BigInt(deadline),
        nonce: BigInt(nonce),
      });

      return json({ payload, signature });
    }

    if (action === "persona") {
      if (!/^\d+$/.test(String(idStr))) return bad("invalid id");
      const id = BigInt(idStr);

      // viem may return tuple as array or object with named props
      const raw = (await client.readContract({
        address: TAMABOT_CORE.address,
        abi: TAMABOT_CORE.abi,
        functionName: "getState",
        args: [id],
      })) as any;

      let level: bigint | number = 0n,
        xp: bigint | number = 0n,
        mood: number = 0,
        hunger: bigint | number = 0n,
        energy: bigint | number = 0n,
        cleanliness: bigint | number = 0n,
        lastTick: bigint | number = 0n,
        fid: bigint | number = 0n;

      if (Array.isArray(raw)) {
        [level, xp, mood, hunger, energy, cleanliness, lastTick, fid] = raw;
      } else if (raw && typeof raw === "object") {
        level = raw.level;
        xp = raw.xp;
        mood = Number(raw.mood);
        hunger = raw.hunger;
        energy = raw.energy;
        cleanliness = raw.cleanliness;
        lastTick = raw.lastTick;
        fid = raw.fid;
      } else {
        return bad("unexpected state shape", 500);
      }

      const data = {
        id: Number(id),
        level: Number(level),
        xp: Number(xp),
        mood: Number(mood),
        hunger: Number(hunger),
        energy: Number(energy),
        cleanliness: Number(cleanliness),
        lastTick: Number(lastTick),
        fid: Number(fid),
      };

      const persona = await aiPersonaFromState(data);

      // Optional save (default ON) if Supabase is configured
      let saved = false;
      if (doSave && hasSupabase()) {
        try {
          // If your lib/data.upsertPersona accepts name now:
          await upsertPersona({
            tokenId: data.id,
            name: persona.name,
            label: persona.label,
            text: persona.bio,   // back-compat arg name
            source: "openai",
          } as any);
          saved = true;
        } catch {
          saved = false;
        }
      }

      return new NextResponse(JSON.stringify({ persona, saved }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "s-maxage=900, stale-while-revalidate=3600",
        },
      });
    }

    return bad("missing or invalid action");
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "server error" }, { status: 500 });
  }
}
