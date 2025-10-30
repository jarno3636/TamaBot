import "dotenv/config";
import { Filebase } from "@filebase/sdk";
import fs from "node:fs";

const client = new Filebase({
  accessKeyId: process.env.FILEBASE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.FILEBASE_SECRET_ACCESS_KEY!,
});

export async function pinAsset(
  localPath: string,
  name?: string
): Promise<{ cid: string; path: string }> {
  const bytes = fs.readFileSync(localPath);
  const res = await client.ipfs.add(bytes, { wrapWithDirectory: true, pin: true, name });
  // res.contentCid is the root CID; the file will be available under /ipfs/<CID>/<filename>
  const filename = name || localPath.split("/").pop()!;
  return { cid: res.contentCid, path: `${res.contentCid}/${filename}` };
}

// CLI: pnpm filebase:pin ./assets/sprites/level1.png sprite_1_lvl1.png
if (require.main === module) {
  const [, , file, fname] = process.argv;
  pinAsset(file, fname).then(console.log).catch(e => { console.error(e); process.exit(1); });
}
