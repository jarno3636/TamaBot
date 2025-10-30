export function ipfsToHttp(uri?: string) {
  if (!uri) return "";
  return uri.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/");
}
