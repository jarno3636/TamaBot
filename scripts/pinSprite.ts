// scripts/pinSprite.ts
import "dotenv/config";
import fs from "node:fs";
import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

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

async function putAndCid(Bucket: string, Key: string, Body: Buffer, ContentType: string) {
  await FILEBASE_S3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));
  const head = await FILEBASE_S3.send(new HeadObjectCommand({ Bucket, Key }));
  const meta = head.Metadata || {};
  const cid = (meta["cid"] || meta["ipfs-hash"] || meta["x-amz-meta-cid"] || "") as string;
  return { Key, cid, ipfsUri: cid ? `ipfs://${cid}/${Key}` : null };
}

/**
 * Usage:
 *   pnpm pin <tokenId> <level> ./assets/sprites/level1.png [./assets/previews/level1.webm]
 */
async function main() {
  const [, , tId, lvl, spritePath, previewPath] = process.argv;
  if (!tId || !lvl || !spritePath) {
    console.error("Usage: pnpm pin <tokenId> <level> <spritePath> [previewPath]");
    process.exit(1);
  }
  const tokenId = Number(tId);
  const level = Number(lvl);
  const Bucket = must("FILEBASE_BUCKET");
  const gateway = (process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io").replace(/\/$/, "");

  // sprite
  const spriteKey = `sprite_${tokenId}_lvl${level}.png`;
  const sprite = await putAndCid(Bucket, spriteKey, fs.readFileSync(spritePath), "image/png");

  // optional preview
  let preview: { Key: string; cid: string; ipfsUri: string | null } | undefined;
  if (previewPath) {
    const previewKey = `preview_${tokenId}_lvl${level}.webm`;
    preview = await putAndCid(Bucket, previewKey, fs.readFileSync(previewPath), "video/webm");
  }

  console.log({
    sprite: {
      ...sprite,
      gatewayUrl: sprite.cid ? `${gateway}/ipfs/${sprite.cid}/${sprite.Key}` : null,
    },
    preview: preview && {
      ...preview,
      gatewayUrl: preview.cid ? `${gateway}/ipfs/${preview.cid}/${preview.Key}` : null,
    },
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
