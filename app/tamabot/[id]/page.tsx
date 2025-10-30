// app/tamabot/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import PetCard from "@/components/PetCard";
import { TAMABOT_CORE } from "@/lib/abi";
import { ipfsToHttp } from "@/lib/ipfs";
import Link from "next/link";

export default function Page({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [tokenURI, setTokenURI] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetadata() {
      try {
        const base = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const res = await fetch(`${base}/api/metadata/base/${TAMABOT_CORE.address}/${id}`);
        if (!res.ok) throw new Error(`Metadata fetch failed (${res.status})`);
        const data = await res.json();

        // Convert to IPFS gateway URL if necessary
        const uri = data.image ? ipfsToHttp(data.image) : "";
        setTokenURI(`${base}/api/metadata/base/${TAMABOT_CORE.address}/${id}`);
      } catch (e: any) {
        console.error(e);
        setError(e.message || "Failed to fetch metadata");
      }
    }
    fetchMetadata();
  }, [id]);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">TamaBot #{id}</h1>
        <Link
          href="/my"
          className="text-sm rounded-lg bg-purple-600 text-white px-3 py-1 hover:bg-purple-500"
        >
          My Pet
        </Link>
      </div>

      {error && (
        <div className="text-red-500 text-sm border border-red-500/30 p-3 rounded-xl bg-red-500/10">
          {error}
        </div>
      )}

      {tokenURI ? (
        <PetCard tokenURI={tokenURI} />
      ) : (
        !error && <div className="text-sm opacity-70">Loading metadata…</div>
      )}
    </main>
  );
}
