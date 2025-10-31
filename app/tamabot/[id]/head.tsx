// app/tamabot/[id]/head.tsx
import type { Metadata } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

export default async function Head({ params }: { params: { id: string } }) {
  const id = Number(params.id || 0);
  const url = `${SITE}/tamabot/${id}`;

  // Use the same JSON your NFT uses
  // (if you prefer, you can fetch chain/address from an env or hardcode your core)
  // Here we ask the page URL for its metadata by hitting the API you already expose:
  const metaUrl = `${SITE}/api/metadata/base/${process.env.NEXT_PUBLIC_CORE_ADDRESS}/${id}`;
  let name = `TamaBot #${id}`;
  let desc = "An AI-shaped Farcaster pet that evolves with your vibe.";
  let image = "";
  try {
    const r = await fetch(metaUrl, { cache: "no-store" });
    const j = await r.json();
    name  = j?.name || name;
    desc  = j?.description || desc;
    image = j?.image || "";
  } catch {}

  return (
    <>
      <title>{name}</title>
      <meta name="description" content={desc} />

      {/* OpenGraph */}
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={name} />
      <meta property="og:description" content={desc} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:alt" content={name} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={name} />
      <meta name="twitter:description" content={desc} />
      {image && <meta name="twitter:image" content={image} />}
    </>
  );
}
