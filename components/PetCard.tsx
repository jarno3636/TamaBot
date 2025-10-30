"use client";
import useSWR from "swr";
import Image from "next/image";
import { ipfsToHttp } from "@/lib/ipfs";

export default function PetCard({ tokenURI }: { tokenURI: string }) {
  const { data } = useSWR(tokenURI, (u)=>fetch(u).then(r=>r.json()));
  if (!data) return <div className="p-6">Loading metadata…</div>;
  const img = ipfsToHttp(data.image);
  return (
    <div className="grid gap-3 p-6 rounded-2xl border border-white/10 bg-white/5">
      <div className="relative w-full aspect-square rounded-2xl overflow-hidden">
        {img && <Image src={img} alt={data.name} fill sizes="512px" />}
      </div>
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">{data.name}</h3>
        <span className="text-sm opacity-70">
          {data.attributes?.find((a:any)=>a.trait_type==="Personality")?.value}
        </span>
      </div>
      <div className="flex gap-2 flex-wrap">
        {data.attributes?.map((a:any)=>(
          <span key={a.trait_type} className="px-3 py-1 rounded-full bg-white/10 text-sm">
            {a.trait_type}: {a.value}
          </span>
        ))}
      </div>
    </div>
  );
}
