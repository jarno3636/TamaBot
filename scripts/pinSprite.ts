// scripts/pinSprite.ts (Filebase version)
import "dotenv/config";
import { Filebase } from "@filebase/sdk";
import fs from "node:fs";

const fb = new Filebase({
  accessKeyId: process.env.FILEBASE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.FILEBASE_SECRET_ACCESS_KEY!,
});

export async function pinSprite(
  tokenId: number,
  level: number,
  spritePath: string,
  previewPath?: string
) {
  const files = [
    { bytes: fs.readFileSync(spritePath), name: `sprite_${tokenId}_lvl${level}.png` },
    ...(previewPath ? [{ bytes: fs.readFileSync(previewPath), name: `preview_${tokenId}_lvl${level}.webm` }] : [])
  ];

  // Add multiple files at once so they're under the same root CID
  const res = await fb.ipfs.add(
    files.map(f => f.bytes),
    { wrapWithDirectory: true, pin: true, name: `tama-${tokenId}-lvl${level}` }
  );

  // The SDK returns a root CID; filenames live under /ipfs/<cid>/<filename>
  const imageCid = `ipfs://${res.contentCid}/sprite_${tokenId}_lvl${level}.png`;
  const previewCid = previewPath ? `ipfs://${res.contentCid}/preview_${tokenId}_lvl${level}.webm` : undefined;

  return { imageCid, previewCid };
}

if (require.main === module) {
  const [, , tId, lvl, sprite, preview] = process.argv;
  pinSprite(Number(tId), Number(lvl), sprite, preview)
    .then(console.log)
    .catch(e => { console.error(e); process.exit(1); });
}
