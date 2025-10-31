"use client";

import useSWR from "swr";
import Image from "next/image";
import { ipfsToHttp } from "@/lib/ipfs";

const fetcher = async (u: string) => {
  const r = await fetch(u);
  if (!r.ok) throw new Error(`Metadata fetch failed (${r.status})`);
  return r.json();
};

export default function PetCard({ tokenURI }: { tokenURI: string }) {
  const { data, error, isLoading } = useSWR(tokenURI, fetcher, { revalidateOnFocus: false });

  if (isLoading) return <div className="glass glass-pad">Loading metadata…</div>;
  if (error) return <div className="glass glass-pad text-red-400 text-sm">Error: {String((error as any)?.message || error)}</div>;
  if (!data) return <div className="glass glass-pad">No metadata found.</div>;

  const img = data.image ? ipfsToHttp(data.image) : "";
  const anim = data.animation_url ? ipfsToHttp(data.animation_url) : "";

  return (
    <div className="glass glass-pad grid gap-4">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {img ? (
          <Image src={img} alt={data.name} fill sizes="512px" className="object-cover" />
        ) : (
          <div className="w-full h-full bg-black/20" />
        )}
      </div>

      {anim && (
        <video className="w-full rounded-xl" autoPlay loop muted playsInline src={anim} />
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{data.name}</h3>
        <span className="text-sm opacity-70">
          {data.attributes?.find((a: any) => a.trait_type === "Personality")?.value}
        </span>
      </div>

      <div className="pill-row">
        {data.attributes?.map((a: any) => (
          <span key={a.trait_type} className="pill-note pill-note--blue text-sm">
            {a.trait_type}: {String(a.value)}
          </span>
        ))}
      </div>
    </div>
  );
}
