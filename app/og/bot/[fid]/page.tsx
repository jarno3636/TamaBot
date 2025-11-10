// app/og/bot/[fid]/page.tsx
import type { Metadata } from "next";

type Params = { fid: string };

export const dynamic = "force-static";
export const revalidate = 300;

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_FC_MINIAPP_LINK ||
    process.env.NEXT_PUBLIC_URL ||
    "https://basebots.vercel.app"
  ).replace(/\/$/, "");
}

export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { fid } = await params;
  const clean = String(fid ?? "").replace(/[^\d]/g, "");
  const base = baseUrl();

  const title = clean ? `Basebot #${clean}` : "Basebots";
  const desc = clean
    ? `On-chain Basebot linked to FID ${clean}.`
    : "On-chain robots from the Blue Tomorrow.";

  // Prefer a Twitter-optimized JPG (1200x675) when we have an FID
  const imgCard = clean
    ? `${base}/api/basebots/card/${clean}`
    : `${base}/og.png`;

  // Light cache-buster to encourage card refresh on X
  const cardWithBuster = `${imgCard}?v=${Date.now().toString().slice(-6)}`;

  const url = clean ? `${base}/og/bot/${clean}` : `${base}/og`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      url,
      images: [{ url: cardWithBuster, width: 1200, height: 675 }],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [cardWithBuster],
    },
    other: {
      "twitter:image:alt": title,
    },
  };
}

export default async function Page(
  { params }: { params: Promise<Params> }
) {
  const { fid } = await params;
  const clean = String(fid ?? "").replace(/[^\d]/g, "");

  return (
    <main style={{ padding: 24, color: "white", background: "#0a0b12", minHeight: "60vh" }}>
      <h1>Basebot #{clean || "—"}</h1>
      <p>This page exists to provide rich previews on Warpcast/X.</p>
      {clean ? (
        <>
          <p>
            Twitter card (1200×675):{" "}
            <a href={`/api/basebots/card/${clean}`}>/api/basebots/card/{clean}</a>
          </p>
          <p>
            Direct PNG:{" "}
            <a href={`/api/basebots/image/${clean}`}>/api/basebots/image/{clean}</a>
          </p>
        </>
      ) : null}
    </main>
  );
}
