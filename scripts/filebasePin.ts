// scripts/filebasePin.ts
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
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

function guessMime(name: string) {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webm") return "video/webm";
  if (ext === "json") return "application/json";
  return "application/octet-stream";
}

async function main() {
  const [, , filePath, keyOverride] = process.argv;
  if (!filePath) {
    console.error("Usage: pnpm filebase:pin <localPath> [keyName]");
    process.exit(1);
  }

  const Bucket = must("FILEBASE_BUCKET"); // must be an IPFS-type bucket
  const Body = fs.readFileSync(filePath);
  const Key = keyOverride || path.basename(filePath);
  const ContentType = guessMime(Key);

  // 1) Upload -> pins to IPFS
  await FILEBASE_S3.send(new PutObjectCommand({ Bucket, Key, Body, ContentType }));

  // 2) HEAD to read the CID header Filebase sets
  const head = await FILEBASE_S3.send(new HeadObjectCommand({ Bucket, Key }));
  const meta = head.Metadata || {};
  const cid = (meta["cid"] || meta["ipfs-hash"] || meta["x-amz-meta-cid"] || "") as string;

  const gateway = (process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io").replace(/\/$/, "");
  console.log({
    cid,
    ipfsUri: cid ? `ipfs://${cid}/${Key}` : null,
    gatewayUrl: cid ? `${gateway}/ipfs/${cid}/${Key}` : null,
    bucket: Bucket,
    key: Key,
    contentType: ContentType,
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
