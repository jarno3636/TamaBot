// app/og/bot/[fid]/page.tsx
import type { Metadata } from "next";

type Params = { fid: string };
export const dynamic = "force-static";
export const revalidate = 300;

function absBase() {
  return (process.env.NEXT_PUBLIC_FC_MINIAPP_LINK || process.env.NEXT_PUBLIC_URL || "https://basebots.vercel.app").replace(/\/$/, "");
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const base = absBase();
  const fid = String(params.fid || "").replace(/[^\d]/g, "");
  const title = fid ? `Basebot #${fid}` : "Basebots";
  const desc = fid
    ? `On-chain Basebot linked to FID ${fid}.`
    : "On-chain robots from the Blue Tomorrow.";

  // This is the PNG that your API route renders (from inline SVG)
  const image = `${base}/api/basebots/image/${fid}`;

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      images: [{ url: image, width: 1200, height: 1200 }],
      url: `${base}/og/bot/${fid}`,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [image],
    },
  };
}

export default function Page({ params }: { params: Params }) {
  // Minimal body (won’t actually be seen; the meta preview is what matters)
  const fid = String(params.fid || "").replace(/[^\d]/g, "");
  return (
    <main style={{ padding: 24, color: "white", background: "#0a0b12", minHeight: "60vh" }}>
      <h1>Basebot #{fid}</h1>
      <p>This page exists to provide rich previews on Warpcast/X.</p>
      <p>Direct image: <a href={`/api/basebots/image/${fid}`}>/api/basebots/image/{fid}</a></p>
    </main>
  );
}
