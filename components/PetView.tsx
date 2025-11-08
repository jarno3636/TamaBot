// components/PetView.tsx
"use client";

import { useEffect, useMemo } from "react";
import useSWR from "swr";
import { useReadContract } from "wagmi";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";
import { CareButtons } from "@/components/CareButtons";

/* ---------- helpers ---------- */
function ipfsToHttp(u?: string) {
  if (!u) return "";
  if (u.startsWith("ipfs://")) return `https://ipfs.io/ipfs/${u.slice(7)}`;
  return u;
}

function parseDataUrlJson(u: string) {
  const [, meta] = u.split("data:application/json", 2);
  if (!meta) throw new Error("Unsupported data URL");
  const [, payload] = u.split(",", 2);
  if (payload == null) throw new Error("Malformed data URL");
  const isB64 = /;base64/i.test(meta);
  const jsonStr = isB64 ? atob(payload) : decodeURIComponent(payload);
  return JSON.parse(jsonStr);
}

const fetcher = async (u: string) => {
  if (u.startsWith("data:application/json")) return parseDataUrlJson(u);
  const url = ipfsToHttp(u);
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) throw new Error(`Metadata fetch failed (${r.status})`);
  return r.json();
};

function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="grid gap-1">
      <div className="flex justify-between text-xs opacity-80">
        <span>{label}</span>
        <span>{Math.round(clamp01(pct) * 100)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full bg-white/70" style={{ width: `${clamp01(pct) * 100}%` }} />
      </div>
    </div>
  );
}

/* ---------- component ---------- */
export default function PetView({ id, metadataUrl }: { id: number; metadataUrl: string }) {
  // 1) Metadata (what your /api/metadata returns)
  const { data: meta, error, isLoading, mutate } = useSWR(metadataUrl, fetcher, {
    revalidateOnFocus: false,
  });

  // 2) On-chain state (for live bars)
  const { data: chainState, refetch: refetchState } = useReadContract({
    address: TAMABOT_CORE.address as `0x${string}`,
    abi: TAMABOT_CORE.abi,
    chainId: base.id,
    functionName: "getState",
    args: [BigInt(id)],
    query: { refetchOnWindowFocus: false } as any,
  });

  // Auto-refresh on-chain state every 10s (feels alive)
  useEffect(() => {
    const t = setInterval(() => refetchState(), 10_000);
    return () => clearInterval(t);
  }, [refetchState]);

  // If your metadata changes after interactions, this is safe to call too
  const refreshAll = () => {
    refetchState();
    mutate();
  };

  /* ---------- UI states ---------- */
  if (isLoading) return <div className="glass glass-pad">Loading pet…</div>;
  if (error)
    return (
      <div className="glass glass-pad text-red-400 text-sm">
        Error loading metadata: {String((error as any)?.message || error)}
      </div>
    );
  if (!meta) return <div className="glass glass-pad">No metadata found.</div>;

  // Media
  const img = ipfsToHttp(meta.image || meta.image_url || "");
  const anim = ipfsToHttp(meta.animation_url || "");

  // Attributes (show all so nothing is “missing”)
  const attributes: Array<{ trait_type?: string; value?: any }> = Array.isArray(meta.attributes)
    ? meta.attributes
    : [];

  // Pull labels
  const name = meta.name || `TamaBot #${id}`;
  const personality =
    attributes.find((a) => a.trait_type === "Personality")?.value ??
    meta.personality ??
    "";

  // Chain state → % bars (assuming 0..100 scale on values)
  const s = chainState as
    | {
        level: bigint;
        xp: bigint;
        mood: number | bigint;
        hunger: number | bigint;
        energy: number | bigint;
        cleanliness: number | bigint;
        lastTick: bigint;
        fid: bigint;
      }
    | undefined;

  const pct = (x: bigint | number | undefined) => clamp01(Number(x ?? 0) / 100);

  return (
    <div className="grid gap-4 w-full max-w-md mx-auto">
      {/* Media (centered, mobile-friendly, no extra top banner) */}
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={name}
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

      {/* Title + personality */}
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold truncate">{name}</h3>
        {personality ? (
          <span className="pill-note pill-note--blue text-xs sm:text-sm">
            {String(personality)}
          </span>
        ) : null}
      </div>

      {/* Live bars from chain */}
      {s && (
        <div className="grid gap-2">
          <Bar label="Mood" pct={pct(s.mood)} />
          <Bar label="Hunger" pct={pct(s.hunger)} />
          <Bar label="Energy" pct={pct(s.energy)} />
          <Bar label="Cleanliness" pct={pct(s.cleanliness)} />
        </div>
      )}

      {/* Interactions (your existing component) */}
      <div className="flex items-center justify-between gap-3">
        <CareButtons id={id} />
        <button onClick={refreshAll} className="btn-ghost text-sm">
          Refresh
        </button>
      </div>

      {/* Full attribute list (compact, no duplication) */}
      {attributes.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {attributes.map((a, i) => (
            <div
              key={`${a.trait_type ?? i}:${String(a.value)}`}
              className="pill-note text-xs sm:text-sm"
            >
              {a.trait_type ? `${a.trait_type}: ` : ""}
              {String(a.value)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
