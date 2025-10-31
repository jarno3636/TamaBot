// app/tamabot/[id]/metadata.ts
import type { Metadata } from "next";

export function generateMetadata(
  { params }: { params: { id: string } }
): Metadata {
  const id = Number(params.id);
  const title = Number.isFinite(id) ? `TamaBot #${id} • TamaBots` : "TamaBot • TamaBots";
  const description = "A Farcaster-aware pet that evolves with your vibe.";
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  const og = `${base}/api/og/pet?id=${id}`;

  return {
    title,
    description,
    openGraph: { title, description, images: [og] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}
