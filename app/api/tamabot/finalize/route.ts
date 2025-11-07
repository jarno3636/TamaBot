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

export const runtime = "nodejs";

/* ------------------- RPC client ------------------- */
const RPC =
  process.env.CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
  process.env.NEXT_PUBLIC_RPC_URL ||
  process.env.RPC_URL ||
  "https://mainnet.base.org";
createPublicClient({ chain: base, transport: http(RPC) });

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
      endpoint: process.env.FILEBASE_S3_ENDPOINT || "https://s3.filebase.com",
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

  // Try to discover CID; if not present, still return HTTPS URL
  let cid: string | null = null;
  try {
    const head = await FILEBASE_S3.send(
      new HeadObjectCommandCtor({
        Bucket: FILEBASE_BUCKET,
        Key,
      })
    );
    const meta = (head?.Metadata || {}) as Record<string, string>;
    cid =
      (meta["cid"] ||
        meta["ipfs-hash"] ||
        meta["x-amz-meta-cid"] ||
        meta["x-amz-meta-ipfs-hash"] ||
        "") || null;
  } catch {
    // ignore; we'll use HTTPS fallback
  }

  const httpsUrl = `https://s3.filebase.com/${FILEBASE_BUCKET}/${Key}`;

  return cid
    ? {
        cid,
        ipfsUri: `ipfs://${cid}/${Key}`,
        gatewayUrl: `${FILEBASE_GATEWAY}/ipfs/${cid}/${Key}`,
      }
    : {
        cid: "",
        ipfsUri: httpsUrl, // use https as “sprite uri” when no CID
        gatewayUrl: httpsUrl,
      };
}

/* ------------------- Handler ------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const tokenId = Number(url.searchParams.get("id") || "0");
    if (!Number.isFinite(tokenId) || tokenId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });
    }
    return await finalize(tokenId);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: number };
    const tokenId = Number(id || 0);
    if (!Number.isFinite(tokenId) || tokenId <= 0) {
      return NextResponse.json({ ok: false, error: "invalid-id" }, { status: 400 });
    }
    return await finalize(tokenId);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

async function finalize(tokenId: number) {
  // Idempotency: if we already have a sprite URI, bail early
  if (hasSupabase()) {
    const existing = await getSpriteCid(tokenId);
    if (existing) return NextResponse.json({ ok: true, id: tokenId, already: true });
  }

  // 🔧 IMPORTANT: pass NUMBER, not bigint
  const s = await getOnchainState(TAMABOT_CORE.address as `0x${string}`, Number(tokenId));
  if (!s?.fid) {
    return NextResponse.json({ ok: false, error: "no-fid-on-token" }, { status: 400 });
  }
  const fid = Number(s.fid);

  const look = pickLook(fid);
  const persona = await generatePersonaText(s, look.archetype.name);

  if (hasSupabase()) {
    try {
      await upsertPersona({
        tokenId,
        text: typeof (persona as any)?.bio === "string" ? (persona as any).bio : String(persona),
        label: (persona as any)?.label ?? "Auto",
        source: "openai",
      });
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

  const prompt = buildArtPrompt(look);

  let uploaded:
    | { cid: string; ipfsUri: string; gatewayUrl: string }
    | null = null;

  if (HAS_OPENAI && HAS_FILEBASE) {
    const b64 = await genImageB64(prompt);
    if (b64) {
      uploaded = await uploadPngToFilebase(tokenId, b64);
      if (uploaded && hasSupabase()) {
        await setSpriteUri(tokenId, uploaded.ipfsUri, fid);
      }
    }
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const ogFallback = `${site}/api/og/pet?id=${tokenId}`;
  const imageUrl = uploaded?.gatewayUrl || ogFallback;

  return NextResponse.json({
    ok: true,
    id: tokenId,
    fid,
    look,
    persona,
    prompt,
    image: imageUrl,
    pinned: Boolean(uploaded && uploaded.cid),
  });
}
