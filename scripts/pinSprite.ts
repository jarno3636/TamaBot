// scripts/pinSprite.ts
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

type PutResult = { Key: string; cid: string; ipfsUri: string | null; gatewayUrl: string | null };

function must(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function guessMimeFromPath(p: string, fallback = "application/octet-stream") {
  const ext = path.extname(p).toLowerCase().replace(".", "");
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webm") return "video/webm";
  if (ext === "mp4") return "video/mp4";
  if (ext === "json") return "application/json";
  return fallback;
}

function parseArgs() {
  // Usage: pnpm pin:sprite <tokenId> <level> <spritePath> [previewPath] [--bucket=...] [--gateway=...] [--dry]
  const argv = process.argv.slice(2);
  const flags: Record<string, string | boolean> = {};
  const pos: string[] = [];
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.+))?$/);
    if (m) flags[m[1]] = m[2] ?? true;
    else pos.push(a);
  }
  return { pos, flags };
}

const FILEBASE_S3 = new S3Client({
  region: "us-east-1",
  endpoint: "https://s3.filebase.com",
  credentials: {
    accessKeyId: must("FILEBASE_ACCESS_KEY_ID"),
    secretAccessKey: must("FILEBASE_SECRET_ACCESS_KEY"),
  },
});

async function putAndCid(opts: {
  Bucket: string;
  Key: string;
  Body: Buffer;
  ContentType: string;
  gateway: string;
  dry?: boolean;
}): Promise<PutResult> {
  const { Bucket, Key, Body, ContentType, gateway, dry } = opts;

  if (!dry) {
    let lastErr: any;
    for (let i = 0; i < 3; i++) {
      try {
        await FILEBASE_S3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
        break;
      } catch (e) {
        lastErr = e;
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    }
    if (lastErr) throw lastErr;
  }

  const head = dry ? undefined : await FILEBASE_S3.send(new HeadObjectCommand({ Bucket, Key }));
  const meta = (head?.Metadata || {}) as Record<string, string>;
  const cid = (meta["cid"] || meta["ipfs-hash"] || meta["x-amz-meta-cid"] || "") as string;

  return {
    Key,
    cid,
    ipfsUri: cid ? `ipfs://${cid}/${Key}` : null,
    gatewayUrl: cid ? `${gateway.replace(/\/$/, "")}/ipfs/${cid}/${Key}` : null,
  };
}

async function main() {
  const { pos, flags } = parseArgs();
  const [tId, lvl, spritePath, previewPath] = pos;

  if (!tId || !lvl || !spritePath) {
    console.error("Usage: pnpm pin:sprite <tokenId> <level> <spritePath> [previewPath] [--bucket=...] [--gateway=...] [--dry]");
    process.exit(1);
  }
  if (!fs.existsSync(spritePath)) throw new Error(`Sprite not found: ${spritePath}`);
  if (previewPath && !fs.existsSync(previewPath)) throw new Error(`Preview not found: ${previewPath}`);

  const Bucket = String(flags.bucket || process.env.FILEBASE_BUCKET || must("FILEBASE_BUCKET"));
  const gateway = String(flags.gateway || process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io");
  const dry = Boolean(flags.dry);

  const tokenId = Number(tId);
  const level = Number(lvl);

  const spriteKey = `sprite_${tokenId}_lvl${level}${path.extname(spritePath) || ".png"}`;
  const previewKey = previewPath ? `preview_${tokenId}_lvl${level}${path.extname(previewPath) || ".webm"}` : undefined;

  const spriteMime = guessMimeFromPath(spritePath, "image/png");
  const previewMime = previewPath ? guessMimeFromPath(previewPath, "video/webm") : undefined;

  const spriteBuf = fs.readFileSync(spritePath);
  const sprite = await putAndCid({
    Bucket,
    Key: spriteKey,
    Body: spriteBuf,
    ContentType: spriteMime,
    gateway,
    dry,
  });

  let preview: PutResult | undefined;
  if (previewPath && previewKey && previewMime) {
    const previewBuf = fs.readFileSync(previewPath);
    preview = await putAndCid({
      Bucket,
      Key: previewKey,
      Body: previewBuf,
      ContentType: previewMime,
      gateway,
      dry,
    });
  }

  const out = {
    tokenId,
    level,
    bucket: Bucket,
    sprite,
    preview: preview ?? null,
    dryRun: dry,
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
