// lib/ipfs.ts
const GATEWAY = process.env.NEXT_PUBLIC_FILEBASE_GATEWAY_URL || "https://ipfs.filebase.io";
export function ipfsToHttp(uri?: string) {
  if (!uri) return "";
  return uri.replace(/^ipfs:\/\//, `${GATEWAY.replace(/\/$/, "")}/ipfs/`);
}
