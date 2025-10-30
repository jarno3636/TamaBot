"use client";

import useSWR from "swr";
import Image from "next/image";
import { ipfsToHttp } from "@/lib/ipfs";

const fetcher = (u: string) => fetch(u).then((r) => {
  if (!r.ok) throw new Error(`Metadata fetch failed (${r.status})`);
  return r.json();
});

export default function PetCard({ tokenURI }: { tokenURI: string }) {
  const { data, error, isLoading } = useSWR(tokenURI, fetcher, { revalidateOnFocus: false });

  if (isLoading) return <div className="p-6">Loading metadata…</div>;
  if (error) return <div className="p-6 text-red-500 text-sm">Error: {String(error.message || error)}</div>;
  if (!data) return <div className="p-6">No metadata found.</div>;

  const img = data.image ? ipfsToHttp(data.image) : "";
  const anim = data.animation_url ? ipfsToHttp(data.animation_url) : "";

  return (
    <div className="grid gap-3 p-6 rounded-2xl border border-white/10 bg-white/5">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {img ? (
          <Image src={img} alt={data.name} fill sizes="512px" />
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
          controls={false}
        />
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{data.name}</h3>
        <span className="text-sm opacity-70">
          {data.attributes?.find((a: any) => a.trait_type === "Personality")?.value}
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {data.attributes?.map((a: any) => (
          <span key={a.trait_type} className="px-3 py-1 rounded-full bg-white/10 text-sm">
            {a.trait_type}: {String(a.value)}
          </span>
        ))}
      </div>
    </div>
  );
}
