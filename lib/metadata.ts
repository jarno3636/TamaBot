import { TAMABOT_CORE } from "@/lib/abi";

/** e.g. /api/metadata/base/0x.../123.json (relative works on any env) */
export function tokenMetadataPath(id: number | string) {
  const addr = (TAMABOT_CORE.address || "").toLowerCase();
  return `/api/metadata/base/${addr}/${String(id)}.json`;
}

export async function fetchTokenMetadata(id: number | string) {
  const url = tokenMetadataPath(id);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`Metadata fetch failed (${r.status}) ${t ? `— ${t}` : ""}`);
  }
  return r.json() as Promise<{
    name: string;
    description?: string;
    image?: string;
    animation_url?: string;
    attributes?: Array<{ trait_type: string; value: any }>;
    external_url?: string;
  }>;
}
