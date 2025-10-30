// lib/data.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

/** ---------- RPC (on-chain) ---------- */
const rpc = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL)
});

/** ---------- Supabase (lazy, server-only) ---------- */
let _supa: SupabaseClient | null = null;

export function hasSupabase() {
  // Using new key naming (Publishable + Secret); we need the Secret on server
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY);
}

function supa(): SupabaseClient {
  if (!_supa) {
    const url = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY; // server-only
    if (!url || !secret) throw new Error("Supabase env missing");
    _supa = createClient(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false }
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
          { name: "fid", type: "uint64" }
        ],
        type: "tuple"
      }
    ]
  }
] as const;

/** ---------- On-chain read ---------- */
export async function getOnchainState(address: `0x${string}` | string, id: number) {
  const [s]: any = await rpc.readContract({
    address: address as `0x${string}`,
    abi: ABI,
    functionName: "getState",
    args: [BigInt(id)]
  });
  return {
    level: Number(s.level),
    xp: Number(s.xp),
    mood: Number(s.mood),
    hunger: Number(s.hunger),
    energy: Number(s.energy),
    cleanliness: Number(s.cleanliness),
    lastTick: Number(s.lastTick),
    fid: Number(s.fid)
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
    previewCid: data.preview_cid
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
