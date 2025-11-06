// app/api/tamabot/finalize/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import { ARCHETYPES } from "@/lib/archetypes";
import { getOnchainState, setSpriteUri, upsertPersona } from "@/lib/data";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

const RPC =
  process.env.CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  "https://mainnet.base.org";

const client = createPublicClient({ chain: base, transport: http(RPC) });

/** ---------- Filebase S3 ---------- */
function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
const FILEBASE_S3 = new S3Client({
  region: "us-east-1",
  endpoint: "https://s3.filebase.com",
  credentials: {
    accessKeyId: must("FILEBASE_ACCESS_KEY_ID"),
    secretAccessKey: must("FILEBASE_SECRET_ACCESS_KEY"),
  },
});
const FILEBASE_BUCKET = must("FILEBASE_BUCKET");
const FILEBASE_GATEWAY = (process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io").replace(/\/$/, "");

/** ---------- Helpers ---------- */
function pickArchetype(fid: number) {
  // deterministic fallback (keeps style cohesive)
  return ARCHETYPES[fid % ARCHETYPES.length];
}

async function buildPersonaText(state: any) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { label: "TamaBot", bio: "Your TamaBot awaits. (AI disabled)" };

  const prompt = `You are TamaBot stylist. Given on-chain state:
${JSON.stringify(state)}
Write:
- "label": a short archetype-style label (e.g., "Curious FrogBot")
- "bio": <= 200 chars, fun & wholesome, include 1 care hint based on weakest stat.

Respond as JSON: {"label":"...","bio":"..."}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 220,
    }),
  }).then((x) => x.json()).catch(() => ({} as any));

  const raw = r?.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(raw);
    const label = String(parsed?.label || "TamaBot");
    const bio = String(parsed?.bio || "Your TamaBot awaits.");
    return { label, bio };
  } catch {
    return { label: "TamaBot", bio: "Your TamaBot awaits." };
  }
}

async function generateImagePngBase64(prompt: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const body = {
    model: "gpt-image-1",
    prompt,
    size: "1024x1024",
    // Background transparency is honored when the model decides it;
    // prompt asks for transparent background.
    // If you need guaranteed alpha, post-process on server (omitted here).
    response_format: "b64_json",
  };

  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((x) => x.json());

  return r?.data?.[0]?.b64_json || null;
}

async function uploadToFilebasePng(tokenId: number, b64: string) {
  const buf = Buffer.from(b64, "base64");
  const Key = `sprite_${tokenId}.png`;

  await FILEBASE_S3.send(new PutObjectCommand({
    Bucket: FILEBASE_BUCKET,
    Key,
    Body: buf,
    ContentType: "image/png",
  }));

  const head = await FILEBASE_S3.send(new HeadObjectCommand({ Bucket: FILEBASE_BUCKET, Key }));
  const meta = (head?.Metadata || {}) as Record<string, string>;
  const cid =
    (meta["cid"] || meta["ipfs-hash"] || meta["x-amz-meta-cid"] || "").toString();

  if (!cid) throw new Error("Filebase did not return a CID (check bucket policies).");

  return {
    cid,
    ipfsUri: `ipfs://${cid}/${Key}`,
    gatewayUrl: `${FILEBASE_GATEWAY}/ipfs/${cid}/${Key}`,
  };
}

/** ---------- Route ---------- */
export async function POST(req: Request) {
  try {
    const { id } = await req.json() as { id: number };
    if (!id || !Number.isFinite(Number(id))) {
      return NextResponse.json({ error: "invalid id" }, { status: 400 });
    }

    // 1) On-chain state (includes fid)
    const s = await getOnchainState(TAMABOT_CORE.address, Number(id));
    const fid = Number(s.fid || 0);

    // 2) Persona text (label + bio)
    const persona = await buildPersonaText({ id, ...s });

    // 3) Pick archetype (deterministic by fid)
    const arch = pickArchetype(fid);

    // 4) Build a single, consistent cel-shaded prompt
    const artPrompt = `
Cel-shaded, cute, front-facing TamaBot creature with transparent background.
Archetype: ${arch.name}. Base color ${arch.baseColor}, accent ${arch.accentColor}.
Keep proportions adorable (large eyes), glossy metal panels, soft rim light.
Style consistency is critical across the collection.
`;

    // 5) Generate PNG image (base64)
    const b64 = await generateImagePngBase64(artPrompt);
    if (!b64) {
      // Still persist persona even if art failed
      if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
        await upsertPersona(id, persona, fid || undefined);
      }
      return NextResponse.json({ error: "image-generation-failed" }, { status: 502 });
    }

    // 6) Upload to Filebase (get CID)
    const uploaded = await uploadToFilebasePng(id, b64);

    // 7) Save to Supabase (image + persona)
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY) {
      await setSpriteUri(id, uploaded.ipfsUri, fid || undefined);
      await upsertPersona(id, persona, fid || undefined);
    }

    return NextResponse.json({
      id,
      fid,
      persona,
      image: uploaded,
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
