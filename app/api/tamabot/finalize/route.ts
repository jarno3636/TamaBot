// app/api/tamabot/finalize/route.ts
import { NextRequest, NextResponse } from "next/server";
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

/* ------------------- RPC (optional) ------------------- */
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

const FILEBASE_BUCKET = String(process.env.FILEBASE_BUCKET || "");
const FILEBASE_GATEWAY = (process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io").replace(/\/$/, "");

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
      forcePathStyle: true, // important for s3.filebase.com/{bucket}/{key}
      credentials: {
        accessKeyId: must("FILEBASE_ACCESS_KEY_ID"),
        secretAccessKey: must("FILEBASE_SECRET_ACCESS_KEY"),
      },
    })
  : null;

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

type UploadedInfo = { cid?: string; ipfsUri?: string; gatewayUrl: string; s3Url: string };

async function uploadPngToFilebase(tokenId: number, b64: string): Promise<UploadedInfo | null> {
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

  // Attempt to read CID from object metadata (may not exist depending on plan/bucket setup)
  let cid: string | undefined;
  try {
    const head = await FILEBASE_S3.send(
      new HeadObjectCommandCtor({
        Bucket: FILEBASE_BUCKET,
        Key,
      })
    );
    const meta = (head?.Metadata || {}) as Record<string, string>;
    cid =
      meta["cid"] ||
      meta["ipfs-hash"] ||
      meta["x-amz-meta-cid"] ||
      undefined;
  } catch {
    // ignore; not all setups return metadata
  }

  const s3Url = `https://s3.filebase.com/${encodeURIComponent(FILEBASE_BUCKET)}/${encodeURIComponent(Key)}`;
  const gatewayUrl = cid ? `${FILEBASE_GATEWAY}/ipfs/${cid}/${encodeURIComponent(Key)}` : s3Url;

  return {
    cid,
    ipfsUri: cid ? `ipfs://${cid}/${Key}` : undefined,
    gatewayUrl,
    s3Url,
  };
}

/* ------------------- core finalize ------------------- */
async function runFinalize(tokenId: number) {
  if (!Number.isFinite(tokenId) || tokenId <= 0) throw new Error("invalid-id");

  // Idempotency: if Supabase already has a sprite, skip work
  if (hasSupabase()) {
    const existing = await getSpriteCid(tokenId);
    if (existing) {
      return {
        ok: true,
        id: tokenId,
        already: true,
        image: (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") + `/api/og/pet?id=${tokenId}`,
        pinned: false,
      };
    }
  }

  // Resolve FID from chain
  const s = await getOnchainState(TAMABOT_CORE.address as `0x${string}`, BigInt(tokenId));
  if (!s?.fid) throw new Error("no-fid-on-token");
  const fid = Number(s.fid);

  // Build deterministic look + persona
  const look = pickLook(fid);
  const persona = await generatePersonaText(s, look.archetype.name); // { label, bio } or string
  const personaObj =
    typeof persona === "object" && persona
      ? { label: String((persona as any).label ?? "Auto"), bio: String((persona as any).bio ?? "") }
      : { label: "Auto", bio: String(persona || "") };

  // Save persona/look if Supabase is wired
  if (hasSupabase()) {
    try {
      await upsertPersona({
        tokenId,
        text: personaObj.bio,
        label: personaObj.label,
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

  // Try image generation + upload
  let uploaded: UploadedInfo | null = null;
  if (HAS_OPENAI && HAS_FILEBASE) {
    const b64 = await genImageB64(prompt);
    if (b64) {
      uploaded = await uploadPngToFilebase(tokenId, b64);
      // Persist sprite URI if we have an ipfsUri; otherwise use S3 URL so it still displays
      if (uploaded && hasSupabase()) {
        const spriteUri = uploaded.ipfsUri || uploaded.s3Url;
        await setSpriteUri(tokenId, spriteUri, fid);
      }
    }
  }

  const site = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const fallback = `${site}/api/og/pet?id=${tokenId}`;

  return {
    ok: true,
    id: tokenId,
    fid,
    look,
    persona: { name: "Tama", label: personaObj.label, bio: personaObj.bio },
    prompt,
    image: uploaded?.gatewayUrl || fallback,
    pinned: Boolean(uploaded),
  };
}

/* ------------------- POST + GET handlers ------------------- */
export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as { id?: number };
    const tokenId = Number(id || 0);
    const out = await runFinalize(tokenId);
    return NextResponse.json(out, { status: out.ok ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}

// So you can hit it in the browser: /api/tamabot/finalize?id=1
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const id = Number(url.searchParams.get("id") || "0");
    const out = await runFinalize(id);
    return NextResponse.json(out, { status: out.ok ? 200 : 400 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
