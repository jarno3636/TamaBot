import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import path from "node:path";

/**
 * Create an IPFS-type bucket in the Filebase dashboard first (e.g. "tamabot-ipfs").
 * Uploading to that bucket pins to IPFS.
 */
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: "https://s3.filebase.com",   // Filebase S3 endpoint
  credentials: {
    accessKeyId: process.env.FILEBASE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.FILEBASE_SECRET_ACCESS_KEY!,
  }
});

export async function uploadToBucket(bucket: string, localPath: string, key?: string) {
  const Body = fs.readFileSync(localPath);
  const Key = key || path.basename(localPath);

  await s3.send(new PutObjectCommand({ Bucket: bucket, Key, Body }));

  // After upload, the bucket’s UI shows the IPFS CID. If you organize as a folder,
  // you can reference /ipfs/<CID>/<Key>. For programmatic CID retrieval, you can
  // either list objects or (recommended) use @filebase/sdk for direct CID.
  return { key: Key };
}

if (require.main === module) {
  const [, , bucket, file, key] = process.argv;
  uploadToBucket(bucket, file, key).then(console.log).catch(e => { console.error(e); process.exit(1); });
}
