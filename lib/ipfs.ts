// lib/ipfs.ts
const DEFAULT_GATEWAY = "https://ipfs.filebase.io";
const GW =
  (process.env.NEXT_PUBLIC_FILEBASE_GATEWAY_URL ||
    process.env.NEXT_PUBLIC_IPFS_GATEWAY ||
    DEFAULT_GATEWAY).replace(/\/$/, "");

export function ipfsToHttp(uri?: string) {
  if (!uri) return "";
  // passthrough already-resolved URLs
  if (/^https?:\/\//i.test(uri)) return uri;
  if (uri.startsWith("data:")) return uri;

  // normalize common ipfs variants
  // ipfs://<cid>[/path]  OR  ipfs://ipfs/<cid>[/path]
  const m = uri.replace(/^ipfs:\/\//i, "").replace(/^ipfs\//i, "");
  return `${GW}/ipfs/${m}`;
}
