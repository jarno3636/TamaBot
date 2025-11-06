// app/api/tamabot/finalize/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import { ARCHETYPES } from "@/lib/archetypes";
import { getOnchainState, getSpriteCid, setSpriteUri, upsertPersona, hasSupabase } from "@/lib/data";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const RPC =
  process.env.CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  "https://mainnet.base.org";
const client = createPublicClient({ chain: base, transport: http(RPC) });

// ---- Filebase ----
function must(name: string) { const v = process.env[name]; if (!v) throw new Error(`Missing env ${name}`); return v; }
const FILEBASE_S3 = new S3Client({ region: "us-east-1", endpoint: "https://s3.filebase.com", credentials: {
  accessKeyId: must("FILEBASE_ACCESS_KEY_ID"),
  secretAccessKey: must("FILEBASE_SECRET_ACCESS_KEY"),
}});
const FILEBASE_BUCKET = must("FILEBASE_BUCKET");
const FILEBASE_GATEWAY = (process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io").replace(/\/$/, "");

// ---- helpers ----
function pickArchetype(fid: number) { return ARCHETYPES[fid % ARCHETYPES.length]; }

async function buildPersona(state: any) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { label: "TamaBot", bio: "Your TamaBot awaits. (AI disabled)" };

  const prompt = `Return compact JSON with keys "label" and "bio".
State: ${JSON.stringify(state)}
Label is like "Curious FrogBot". Bio <= 200 chars, cute, 1 care hint.
JSON only.`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.7, max_tokens: 220,
      messages: [{ role: "user", content: prompt }] }),
  }).then(x => x.json()).catch(() => ({}));

  const raw = r?.choices?.[0]?.message?.content || "{}";
  try { const j = JSON.parse(raw); return { label: String(j.label||"TamaBot"), bio: String(j.bio||"Your TamaBot awaits.") }; }
  catch { return { label: "TamaBot", bio: "Your TamaBot awaits." }; }
}

async function genImageB64(prompt: string) {
  const key = process.env.OPENAI_API_KEY; if (!key) return null;
  const body = { model: "gpt-image-1", prompt, size: "1024x1024", response_format: "b64_json" };
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body),
  }).then(x => x.json());
  return r?.data?.[0]?.b64_json || null;
}

async function uploadPng(tokenId: number, b64: string) {
  const Key = `sprite_${tokenId}.png`;
  const Body = Buffer.from(b64, "base64");
  await FILEBASE_S3.send(new PutObjectCommand({ Bucket: FILEBASE_BUCKET, Key, Body, ContentType: "image/png" }));
  const head = await FILEBASE_S3.send(new HeadObjectCommand({ Bucket: FILEBASE_BUCKET, Key }));
  const meta = (head?.Metadata || {}) as Record<string,string>;
  const cid = (meta["cid"] || meta["ipfs-hash"] || meta["x-amz-meta-cid"] || "").toString();
  if (!cid) throw new Error("No CID from Filebase (check bucket policy).");
  return { cid, ipfsUri: `ipfs://${cid}/${Key}`, gatewayUrl: `${FILEBASE_GATEWAY}/ipfs/${cid}/${Key}` };
}

export async function POST(req: Request) {
  try {
    const { id } = await req.json() as { id: number };
    if (!id || !Number.isFinite(Number(id))) return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });

    // Idempotency: if we already have a sprite URI, bail out early
    if (hasSupabase()) {
      const existing = await getSpriteCid(id);
      if (existing) return NextResponse.json({ ok: true, id, already: true });
    }

    const s = await getOnchainState(TAMABOT_CORE.address, id);
    const fid = Number(s.fid || 0);

    const persona = await buildPersona({ id, ...s });
    if (hasSupabase()) await upsertPersona(id, persona, fid || undefined);

    // Consistent cel-shaded prompt
    const arch = pickArchetype(fid);
    const artPrompt = `
Cel-shaded, cute, front-facing ${arch.name} with transparent background.
Keep style consistent across collection. Glossy metal plates, soft rim light.
Base color ${arch.baseColor}, accent ${arch.accentColor}.`;

    const b64 = await genImageB64(artPrompt);
    if (!b64) return NextResponse.json({ ok: false, id, error: "image-failed" }, { status: 502 });

    const uploaded = await uploadPng(id, b64);
    if (hasSupabase()) await setSpriteUri(id, uploaded.ipfsUri, fid || undefined);

    return NextResponse.json({ ok: true, id, fid, persona, image: uploaded });
  } catch (e: any) {
    // If something races, keep it idempotent
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 200 });
  }
}
