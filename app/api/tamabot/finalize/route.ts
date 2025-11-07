// app/api/tamabot/finalize/route.ts
import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import {
  getOnchainState,
  hasSupabase,
  getSpriteCid,
  setSpriteUri,
  upsertPersona,
  upsertLook,
} from "@/lib/data";
import { pickLook, buildArtPrompt } from "@/lib/archetypes";
import { generatePersonaText } from "@/lib/persona";

// Node runtime (we may use AWS SDK)
export const runtime = "nodejs";

/* ------------------- RPC client ------------------- */
const RPC =
  process.env.CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  "https://mainnet.base.org";
const client = createPublicClient({ chain: base, transport: http(RPC) });

/* ------------------- Filebase (optional) ------------------- */
const HAS_FILEBASE =
  !!process.env.FILEBASE_ACCESS_KEY_ID &&
  !!process.env.FILEBASE_SECRET_ACCESS_KEY &&
  !!process.env.FILEBASE_BUCKET;

let S3ClientCtor: any, PutObjectCommandCtor: any, HeadObjectCommandCtor: any;
if (HAS_FILEBASE) {
  const { S3Client, PutObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");
  S3ClientCtor = S3Client;
  PutObjectCommandCtor = PutObjectCommand;
  HeadObjectCommandCtor = HeadObjectCommand;
}

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const FILEBASE_S3 = HAS_FILEBASE
  ? new S3ClientCtor({
      region: "us-east-1",
      endpoint: "https://s3.filebase.com",
      credentials: {
        accessKeyId: must("FILEBASE_ACCESS_KEY_ID"),
        secretAccessKey: must("FILEBASE_SECRET_ACCESS_KEY"),
      },
    })
  : null;

const FILEBASE_BUCKET = HAS_FILEBASE ? must("FILEBASE_BUCKET") : "";
const FILEBASE_GATEWAY = (process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io").replace(
  /\/$/,
  ""
);

/* ------------------- OpenAI (optional image) ------------------- */
const HAS_OPENAI = !!process.env.OPENAI_API_KEY;

async function genImageB64(prompt: string) {
  if (!HAS_OPENAI) return null;
  const r = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  }).then((x) => x.json());
  return r?.data?.[0]?.b64_json || null;
}

async function uploadPngToFilebase(tokenId: number, b64: string) {
  if (!HAS_FILEBASE || !FILEBASE_S3) return null;
  const Key = `sprite_${tokenId}.png`;
  const Body = Buffer.from(b64, "base64");
  await FILEBASE_S3.send(
    new PutObjectCommandCtor({
      Bucket: FILEBASE_BUCKET,
      Key,
      Body,
      ContentType: "image/png",
    })
  );
  const head = await FILEBASE_S3.send(
    new HeadObjectCommandCtor({
      Bucket: FILEBASE_BUCKET,
      Key,
    })
  );
  const meta = (head?.Metadata || {}) as Record<string, string>;
  const cid = (meta["cid"] || meta["ipfs-hash"] || meta["x-amz-meta-cid"] || "").toString();
  if (!cid) throw new Error("No CID returned by Filebase HeadObject; check bucket policies.");
  return {
    cid,
    ipfsUri: `ipfs://${cid}/${Key}`,
    gatewayUrl: `${FILEBASE_GATEWAY}/ipfs/${cid}/${Key}`,
  };
}

/* ------------------- Handler ------------------- */
export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: number };
    const tokenId = Number(id || 0);
    if (!Number.isFinite(tokenId) || tokenId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });
    }

    // Idempotency: if we already have a sprite URI, bail out early
    if (hasSupabase()) {
      const existing = await getSpriteCid(tokenId);
      if (existing) return NextResponse.json({ ok: true, id: tokenId, already: true });
    }

    // On-chain -> FID
    const s = await getOnchainState(TAMABOT_CORE.address, tokenId);
    if (!s?.fid) {
      return NextResponse.json({ ok: false, error: "no-fid-on-token" }, { status: 400 });
    }
    const fid = Number(s.fid);

    // Deterministic visual look + short persona
    const look = pickLook(fid);
    const personaText = await generatePersonaText(s, look.archetype.name);

    // Persist persona & look if Supabase exists
    if (hasSupabase()) {
      try {
        await upsertPersona(tokenId, personaText, "Auto", "openai");
        await upsertLook(tokenId, {
          archetypeId: look.archetype.id,
          baseColor: look.base,
          accentColor: look.accent,
          auraColor: look.aura,
          biome: look.biome,
          accessory: look.accessory,
        });
      } catch {
        // non-fatal
      }
    }

    // Build art prompt regardless (used for image or just for debugging)
    const prompt = buildArtPrompt(look);

    // Try to auto-generate & pin image (only if both OpenAI + Filebase available)
    let uploaded:
      | { cid: string; ipfsUri: string; gatewayUrl: string }
      | null = null;

    if (HAS_OPENAI && HAS_FILEBASE) {
      const b64 = await genImageB64(prompt);
      if (b64) {
        uploaded = await uploadPngToFilebase(tokenId, b64);
        // Save sprite URI for metadata if Supabase present
        if (uploaded && hasSupabase()) {
          await setSpriteUri(tokenId, uploaded.ipfsUri, fid);
        }
      }
    }

    // Always return a displayable image: pinned PNG if we have it; otherwise OG fallback
    const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
    const ogFallback = `${site}/api/og/pet?id=${tokenId}`;
    const imageUrl = uploaded?.gatewayUrl || ogFallback;

    return NextResponse.json({
      ok: true,
      id: tokenId,
      fid,
      look,
      persona: personaText,
      prompt,
      image: imageUrl,
      pinned: Boolean(uploaded),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
