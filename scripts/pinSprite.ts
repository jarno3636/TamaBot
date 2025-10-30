// scripts/pinSprite.ts
import "dotenv/config";
import fs from "node:fs";
import { ObjectManager } from "@filebase/sdk";

/**
 * Upload sprite + optional preview together (packed as a CAR),
 * so they share a single root CID. Returns ipfs:// URIs.
 *
 * Usage:
 *   pnpm pin <tokenId> <level> ./assets/sprites/level1.png [./assets/previews/level1.webm]
 */
export async function pinSprite(
  tokenId: number,
  level: number,
  spritePath: string,
  previewPath?: string
) {
  const S3_KEY = process.env.FILEBASE_ACCESS_KEY_ID!;
  const S3_SECRET = process.env.FILEBASE_SECRET_ACCESS_KEY!;
  const BUCKET = process.env.FILEBASE_BUCKET!;
  if (!S3_KEY || !S3_SECRET || !BUCKET) {
    throw new Error("Missing FILEBASE_ACCESS_KEY_ID/FILEBASE_SECRET_ACCESS_KEY/FILEBASE_BUCKET");
  }

  const objectManager = new ObjectManager(S3_KEY, S3_SECRET, { bucket: BUCKET });

  const spriteName = `sprite_${tokenId}_lvl${level}.png`;
  const files: Array<{ path: string; content: Buffer }> = [
    { path: spriteName, content: fs.readFileSync(spritePath) }
  ];
  if (previewPath) {
    files.push({ path: `preview_${tokenId}_lvl${level}.webm`, content: fs.readFileSync(previewPath) });
  }

  // When 'source' is an array, ObjectManager.upload packs a CAR and returns the root CID.  [oai_citation:1‡filebase.github.io](https://filebase.github.io/filebase-sdk/ObjectManager.html?utm_source=chatgpt.com)
  const head = await objectManager.upload(`tama-${tokenId}-lvl${level}.car`, files, { "Content-Type": "application/car" });
  const cid = head?.["x-amz-meta-cid"] || head?.cid || "";

  const imageCid = cid ? `ipfs://${cid}/${spriteName}` : "";
  const previewCid = cid && files.length > 1 ? `ipfs://${cid}/preview_${tokenId}_lvl${level}.webm` : undefined;

  return { imageCid, previewCid, rootCid: cid };
}

// CLI
if (require.main === module) {
  const [, , tId, lvl, sprite, preview] = process.argv;
  pinSprite(Number(tId), Number(lvl), sprite, preview)
    .then(console.log)
    .catch((e) => { console.error(e); process.exit(1); });
}
