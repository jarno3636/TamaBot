import { Web3Storage, File } from "web3.storage";
import fs from "fs";

const client = new Web3Storage({ token: process.env.WEB3_STORAGE_TOKEN! });

export async function pinSprite(tokenId: number, level: number, spritePath: string, previewPath?: string) {
  const files: File[] = [new File([fs.readFileSync(spritePath)], `sprite_${tokenId}_lvl${level}.png`)];
  if (previewPath) files.push(new File([fs.readFileSync(previewPath)], `preview_${tokenId}_lvl${level}.webm`));
  const cid = await client.put(files, { wrapWithDirectory: true, name: `tama-${tokenId}-lvl${level}` });
  return {
    imageCid: `ipfs://${cid}/sprite_${tokenId}_lvl${level}.png`,
    previewCid: previewPath ? `ipfs://${cid}/preview_${tokenId}_lvl${level}.webm` : undefined,
  };
}
