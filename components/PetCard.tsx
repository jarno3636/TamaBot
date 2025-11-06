"use client";

import useSWR from "swr";

/** Minimal IPFS normalizer for both metadata + media */
function ipfsToHttp(u?: string) {
  if (!u) return "";
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice("ipfs://".length)}`;
  return u;
}

/** Parse data:application/json[;base64], return JS object or throw */
function parseDataUrlJson(u: string) {
  // data:application/json;...
  const [, meta] = u.split("data:application/json", 2);
  if (!meta) throw new Error("Unsupported data URL");
  const [, payload] = u.split(",", 2);
  if (payload == null) throw new Error("Malformed data URL");
  const isB64 = /;base64/i.test(meta);
  const jsonStr = isB64 ? atob(payload) : decodeURIComponent(payload);
  return JSON.parse(jsonStr);
}

const fetcher = async (u: string) => {
  // Handle data: JSON right here
  if (u.startsWith("data:application/json")) {
    return parseDataUrlJson(u);
  }
  // Normalize ipfs:// to https
  const url = ipfsToHttp(u);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Metadata fetch failed (${r.status})`);
  return r.json();
};

export default function PetCard({ tokenURI }: { tokenURI: string }) {
  const key = tokenURI; // SWR key (we normalize inside fetcher to keep caching per original URI)
  const { data, error, isLoading } = useSWR(key, fetcher, { revalidateOnFocus: false });

  if (isLoading) return <div className="glass glass-pad">Loading metadata…</div>;
  if (error)     return <div className="glass glass-pad text-red-400 text-sm">Error: {String((error as any)?.message || error)}</div>;
  if (!data)     return <div className="glass glass-pad">No metadata found.</div>;

  const img  = ipfsToHttp(data.image || data.image_url || "");
  const anim = ipfsToHttp(data.animation_url || "");

  return (
    <div className="glass glass-pad grid gap-4">
      {/* Use plain <img> so you don’t need next.config image allowlist */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={data.name || "TamaBot"}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full bg-black/20" />
        )}
      </div>

      {anim && (
        <video
          className="w-full rounded-xl"
          autoPlay
          loop
          muted
          playsInline
          src={anim}
        />
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{data.name || "TamaBot"}</h3>
        <span className="text-sm opacity-70">
          {data.attributes?.find((a: any) => a.trait_type === "Personality")?.value ?? ""}
        </span>
      </div>

      <div className="pill-row">
        {(data.attributes ?? []).map((a: any) => (
          <span key={`${a.trait_type}:${a.value}`} className="pill-note pill-note--blue text-sm">
            {a.trait_type}: {String(a.value)}
          </span>
        ))}
      </div>
    </div>
  );
}
