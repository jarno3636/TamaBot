// lib/data.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/** ---------- RPC (on-chain) ---------- */
// Try server-first key names, then public, then hard fallback to mainnet Base
const RPC_URL =
  process.env.CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  "https://mainnet.base.org";

export const rpc = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

/** ---------- Supabase (lazy, server-only) ---------- */
let _supa: SupabaseClient | null = null;

export function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function supa(): SupabaseClient {
  if (!_supa) {
    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secret) throw new Error("Supabase env missing");
    _supa = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supa!;
}

/** ---------- Minimal ABI for getState ---------- */
const ABI = [
  {
    type: "function",
    name: "getState",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        components: [
          { name: "level", type: "uint64" },
          { name: "xp", type: "uint64" },
          { name: "mood", type: "int32" },
          { name: "hunger", type: "uint64" },
          { name: "energy", type: "uint64" },
          { name: "cleanliness", type: "uint64" },
          { name: "lastTick", type: "uint64" },
          { name: "fid", type: "uint64" },
        ],
        type: "tuple",
      },
    ],
  },
] as const;

/** ---------- On-chain read (tolerant to viem tuple shape) ---------- */
export async function getOnchainState(address: `0x${string}` | string, id: number) {
  const raw: any = await rpc.readContract({
    address: address as `0x${string}`,
    abi: ABI,
    functionName: "getState",
    args: [BigInt(id)],
  });

  // viem can return either an array tuple, or an object with named props.
  const s = Array.isArray(raw) ? raw : raw;

  return {
    level: Number((s.level ?? s[0]) ?? 0),
    xp: Number((s.xp ?? s[1]) ?? 0),
    mood: Number((s.mood ?? s[2]) ?? 0),
    hunger: Number((s.hunger ?? s[3]) ?? 0),
    energy: Number((s.energy ?? s[4]) ?? 0),
    cleanliness: Number((s.cleanliness ?? s[5]) ?? 0),
    lastTick: Number((s.lastTick ?? s[6]) ?? 0),
    fid: Number((s.fid ?? s[7]) ?? 0),
  };
}

/** ---------- DB helpers (server-only) ---------- */
export async function getPersona(id: number) {
  const { data } = await supa()
    .from("pets")
    .select("persona, preview_cid")
    .eq("token_id", id)
    .maybeSingle();
  if (!data) return null as any;
  return {
    label: data.persona?.label,
    bio: data.persona?.bio,
    previewCid: data.preview_cid,
  };
}

export async function getSpriteCid(id: number) {
  const { data } = await supa()
    .from("pets")
    .select("current_image_cid")
    .eq("token_id", id)
    .maybeSingle();
  return data?.current_image_cid || "";
}

/** ---------- NEW: upsert persona text into pets ---------- */
export async function upsertPersona(opts: {
  tokenId: number;
  text: string;
  label?: string;
  source?: string;
  previewCid?: string | null;
}) {
  const { tokenId, text, label = "Auto", source = "openai", previewCid = null } = opts;
  const db = supa();
  const now = new Date().toISOString();

  const persona = {
    label,
    bio: text,
    source,
    created_at: now,
  };

  const payload: Record<string, any> = {
    token_id: tokenId,
    persona,
    updated_at: now,
  };
  if (previewCid) payload.preview_cid = previewCid;

  const { error } = await db
    .from("pets")
    .upsert(payload, { onConflict: "token_id" });

  if (error) throw new Error(error.message);
  return true;
}
