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
          { name: "level",       type: "uint64" },
          { name: "xp",          type: "uint64" },
          { name: "mood",        type: "int32"  },
          { name: "hunger",      type: "uint64" },
          { name: "energy",      type: "uint64" },
          { name: "cleanliness", type: "uint64" },
          { name: "lastTick",    type: "uint64" },
          { name: "fid",         type: "uint64" }
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

  // viem can return either an array tuple OR an object with named props.
  const s = raw;

  return {
    level:       Number((s.level       ?? s[0]) ?? 0),
    xp:          Number((s.xp          ?? s[1]) ?? 0),
    mood:        Number((s.mood        ?? s[2]) ?? 0),
    hunger:      Number((s.hunger      ?? s[3]) ?? 0),
    energy:      Number((s.energy      ?? s[4]) ?? 0),
    cleanliness: Number((s.cleanliness ?? s[5]) ?? 0),
    lastTick:    Number((s.lastTick    ?? s[6]) ?? 0),
    fid:         Number((s.fid         ?? s[7]) ?? 0),
  };
}

/** ---------- DB getters (server-only) ---------- */
export async function getPersona(id: number) {
  const { data } = await supa()
    .from("pets")
    .select("persona, preview_cid")
    .eq("token_id", id)
    .maybeSingle();
  if (!data) return null as any;
  return {
    name: (data.persona as any)?.name,     // tolerant: may or may not exist
    label: (data.persona as any)?.label,
    bio: (data.persona as any)?.bio,
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

/** ============================================================================
 * UPSERT HELPERS
 * - upsertPersona: object-style API (preferred) + legacy positional overload
 * - upsertLook: store deterministic look pack (archetype/colors/biome/etc.)
 * - setSpriteUri: persist ipfs://CID/Key for the current sprite
 * ========================================================================== */

/** ---------- NEW: upsert look ---------- */
export async function upsertLook(
  tokenId: number,
  look: {
    archetypeId: string;
    baseColor: string;
    accentColor: string;
    auraColor?: string;
    biome?: string;
    accessory?: string;
  }
) {
  const db = supa();
  const now = new Date().toISOString();
  const payload = {
    token_id: tokenId,
    look,
    updated_at: now,
  };
  const { error } = await db.from("pets").upsert(payload, { onConflict: "token_id" });
  if (error) throw new Error(error.message);
  return true;
}

/** ---------- PREFERRED: object-style persona upsert ---------- */
export async function upsertPersona(opts: {
  tokenId: number;
  text: string;               // bio
  name?: string;              // optional name (short unique-ish)
  label?: string;             // e.g., "Auto"
  source?: string;            // e.g., "openai"
  previewCid?: string | null; // optional media preview
}) {
  const {
    tokenId,
    text,
    name = "Tama",
    label = "Auto",
    source = "openai",
    previewCid = null,
  } = opts;

  const db = supa();
  const now = new Date().toISOString();

  const persona = {
    name,
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

  const { error } = await db.from("pets").upsert(payload, { onConflict: "token_id" });
  if (error) throw new Error(error.message);
  return true;
}

/** ---------- LEGACY: positional persona upsert (back-compat) ----------
 * Usage kept for older callers:
 *   await upsertPersonaLegacy(tokenId, text, label?, source?)
 */
export async function upsertPersonaLegacy(
  tokenId: number,
  text: string,
  label = "Auto",
  source = "openai"
) {
  return upsertPersona({ tokenId, text, label, source });
}

/** ---------- set current sprite ipfs://CID/Key ---------- */
export async function setSpriteUri(tokenId: number, ipfsUri: string, _fid?: number) {
  const db = supa();
  const now = new Date().toISOString();
  const { error } = await db
    .from("pets")
    .upsert({ token_id: tokenId, current_image_cid: ipfsUri, updated_at: now }, { onConflict: "token_id" });
  if (error) throw new Error(error.message);
  return true;
}
