// scripts/filebasePin.ts
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ObjectManager } from "@filebase/sdk";

/**
 * Single-file upload to Filebase (pins to IPFS) and logs the CID.
 * Usage:
 *   pnpm filebase:pin ./assets/sprites/level1.png sprite_1_lvl1.png
 */
async function main() {
  const [,, filePath, keyNameArg] = process.argv;
  if (!filePath) {
    console.error("Usage: pnpm filebase:pin <localPath> [keyName]");
    process.exit(1);
  }

  const S3_KEY = process.env.FILEBASE_ACCESS_KEY_ID!;
  const S3_SECRET = process.env.FILEBASE_SECRET_ACCESS_KEY!;
  const BUCKET = process.env.FILEBASE_BUCKET!;
  if (!S3_KEY || !S3_SECRET || !BUCKET) {
    throw new Error("Missing FILEBASE_ACCESS_KEY_ID/FILEBASE_SECRET_ACCESS_KEY/FILEBASE_BUCKET");
  }

  const objectManager = new ObjectManager(S3_KEY, S3_SECRET, { bucket: BUCKET });

  const bytes = fs.readFileSync(filePath);
  const keyName = keyNameArg || path.basename(filePath);

  // Upload as a single object; SDK returns headers incl. CID
  const head = await objectManager.upload(keyName, bytes, { "Content-Type": guessMime(keyName) });
  // The SDK returns an object with response headers; CID is available in 'x-amz-meta-cid'
  const cid = head?.["x-amz-meta-cid"] || head?.cid || "";

  console.log({
    cid,
    ipfsUri: cid ? `ipfs://${cid}/${keyName}` : null,
    gatewayUrl: cid
      ? `${(process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io").replace(/\/$/,"")}/ipfs/${cid}/${keyName}`
      : null
  });
}

function guessMime(name: string) {
  const ext = name.toLowerCase().split(".").pop() || "";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webm") return "video/webm";
  if (ext === "json") return "application/json";
  return "application/octet-stream";
}

main().catch((e) => { console.error(e); process.exit(1); });
