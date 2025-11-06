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

function parseArgs() {
  // Usage: pnpm filebase:pin <localPath> [--key=name.ext] [--bucket=...] [--gateway=...] [--dry]
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

function guessMime(name: string) {
  const ext = (name.split(".").pop() || "").toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  if (ext === "webm") return "video/webm";
  if (ext === "mp4") return "video/mp4";
  if (ext === "json") return "application/json";
  if (ext === "svg") return "image/svg+xml";
  return "application/octet-stream";
}

const FILEBASE_S3 = new S3Client({
  region: "us-east-1",
  endpoint: "https://s3.filebase.com",
  credentials: {
    accessKeyId: must("FILEBASE_ACCESS_KEY_ID"),
    secretAccessKey: must("FILEBASE_SECRET_ACCESS_KEY"),
  },
});

async function uploadOne(opts: {
  Bucket: string;
  localPath: string;
  keyName?: string;
  gateway: string;
  dry?: boolean;
}) {
  const { Bucket, localPath, keyName, gateway, dry } = opts;
  if (!fs.existsSync(localPath)) throw new Error(`Not found: ${localPath}`);
  const stat = fs.statSync(localPath);
  if (!stat.isFile()) throw new Error(`Not a file: ${localPath}`);

  const Body = fs.readFileSync(localPath);
  const Key = keyName || path.basename(localPath);
  const ContentType = guessMime(Key);

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

  const base = gateway.replace(/\/$/, "");
  return {
    cid,
    ipfsUri: cid ? `ipfs://${cid}/${Key}` : null,
    gatewayUrl: cid ? `${base}/ipfs/${cid}/${Key}` : null,
    bucket: Bucket,
    key: Key,
    contentType: ContentType,
    size: Body.length,
    dryRun: Boolean(dry),
  };
}

async function main() {
  const { pos, flags } = parseArgs();
  const filePath = pos[0];
  if (!filePath) {
    console.error("Usage: pnpm filebase:pin <localPath> [--key=name.ext] [--bucket=...] [--gateway=...] [--dry]");
    process.exit(1);
  }

  const Bucket = String(flags.bucket || process.env.FILEBASE_BUCKET || must("FILEBASE_BUCKET"));
  const gateway = String(flags.gateway || process.env.FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io");
  const keyOverride = typeof flags.key === "string" ? flags.key : undefined;
  const dry = Boolean(flags.dry);

  const out = await uploadOne({ Bucket, localPath: filePath, keyName: keyOverride, gateway, dry });
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
