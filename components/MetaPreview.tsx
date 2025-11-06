"use client";

import { useEffect, useState } from "react";
import { fetchTokenMetadata } from "@/lib/metadata";

/** Renders the NFT image (or a friendly error). */
export default function MetaPreview({ id }: { id: number }) {
  const [img, setImg] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setErr("");
        const j = await fetchTokenMetadata(id);
        if (!alive) return;
        setName(j?.name || `TamaBot #${id}`);
        // prefer image, else animation_url
        setImg((j?.image || j?.animation_url || "") as string);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Metadata fetch failed");
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (err) {
    return (
      <div className="glass glass-pad">
        <div className="pill-note pill-note--red">{String(err)}</div>
      </div>
    );
  }

  return (
    <div className="glass glass-pad">
      <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/20">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {img ? (
          <img alt={name} src={img} className="w-full h-auto object-contain" />
        ) : (
          <div className="p-6 text-white/70">Loading media…</div>
        )}
      </div>
    </div>
  );
}
