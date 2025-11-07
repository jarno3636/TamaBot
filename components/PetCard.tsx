// components/PetCard.tsx
"use client";

import useSWR from "swr";

/** Minimal IPFS normalizer for both metadata + media */
function ipfsToHttp(u?: string) {
  if (!u) return "";
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice("ipfs://".length)}`;
  return u;
}

/** Parse data:application/json[;base64] → JS object */
function parseDataUrlJson(u: string) {
  const [, meta] = u.split("data:application/json", 2);
  if (!meta) throw new Error("Unsupported data URL");
  const [, payload] = u.split(",", 2);
  if (payload == null) throw new Error("Malformed data URL");
  const isB64 = /;base64/i.test(meta);
  const jsonStr = isB64 ? atob(payload) : decodeURIComponent(payload);
  return JSON.parse(jsonStr);
}

/** Fetcher that accepts:
 *  - data:application/json...
 *  - ipfs://...
 *  - http(s)://... (including your /api/metadata/... route)
 */
const fetcher = async (u: string) => {
  // data: application/json
  if (u.startsWith("data:application/json")) return parseDataUrlJson(u);

  // normalize ipfs
  const url = ipfsToHttp(u);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Metadata fetch failed (${r.status})`);
  return r.json();
};

type PetCardProps =
  | { tokenURI: string; metadataUrl?: never }
  | { tokenURI?: never; metadataUrl: string };

/** Compact, mobile-first Pet card */
export default function PetCard(props: PetCardProps) {
  const key = props.metadataUrl ?? props.tokenURI;
  const { data, error, isLoading } = useSWR(key, fetcher, { revalidateOnFocus: false });

  if (isLoading) return <div className="glass glass-pad">Loading pet…</div>;
  if (error)     return <div className="glass glass-pad text-red-400 text-sm">Error: {String((error as any)?.message || error)}</div>;
  if (!data)     return <div className="glass glass-pad">No metadata found.</div>;

  // Resolve main image/animation
  const img  = ipfsToHttp(data.image || data.image_url || "");
  const anim = ipfsToHttp(data.animation_url || "");

  // Pull key attributes we actually want to show
  const attrs: Array<{ trait_type?: string; value?: any }> = Array.isArray(data.attributes)
    ? data.attributes
    : [];

  const byType = (t: string) => attrs.find(a => a?.trait_type === t)?.value;

  // Common traits (adjust names to match your metadata exactly)
  const personality = byType("Personality") ?? data.personality ?? "";
  const biome       = byType("Biome") ?? "";
  const accessory   = byType("Accessory") ?? "";
  const baseColor   = byType("Base Color") ?? byType("Base") ?? "";
  const accentColor = byType("Accent Color") ?? byType("Accent") ?? "";
  const auraColor   = byType("Aura Color") ?? byType("Aura") ?? "";

  return (
    <div className="glass glass-pad grid gap-4">
      {/* Media (image gets priority; if none, show animation thumbnail/video) */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={data.name || "TamaBot"}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            decoding="async"
          />
        ) : anim ? (
          <video
            className="h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            src={anim}
          />
        ) : (
          <div className="w-full h-full bg-black/20" />
        )}
      </div>

      {/* Title + personality label */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold truncate">{data.name || "TamaBot"}</h3>
        {personality ? (
          <span className="pill-note pill-note--blue text-xs sm:text-sm">{String(personality)}</span>
        ) : null}
      </div>

      {/* Key details only (no redundant raw state / debug) */}
      <div className="grid grid-cols-2 gap-2">
        {biome ? (
          <div className="pill-note pill-note--yellow text-xs sm:text-sm">Biome: {String(biome)}</div>
        ) : null}
        {accessory ? (
          <div className="pill-note pill-note--yellow text-xs sm:text-sm">Accessory: {String(accessory)}</div>
        ) : null}
        {baseColor ? (
          <div className="pill-note text-xs sm:text-sm">Base: {String(baseColor)}</div>
        ) : null}
        {accentColor ? (
          <div className="pill-note text-xs sm:text-sm">Accent: {String(accentColor)}</div>
        ) : null}
        {auraColor ? (
          <div className="pill-note text-xs sm:text-sm">Aura: {String(auraColor)}</div>
        ) : null}
      </div>
    </div>
  );
}
