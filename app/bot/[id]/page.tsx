import Image from "next/image";
import type { Metadata } from "next";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = params.id;
  const origin = process.env.NEXT_PUBLIC_URL || "https://your-site.example";
  const title = `Basebot #${id}`;
  const desc  = "Basebots — on-chain FID bots with HD cel-shaded render.";
  const img   = `${origin}/api/img/${id}.png`;

  return {
    title, description: desc,
    openGraph: {
      title, description: desc, type: "website",
      images: [{ url: img, width: 1200, height: 1200, alt: title }],
    },
    twitter: {
      card: "summary_large_image", title, description: desc, images: [img],
    },
  };
}

export default function BotPage({ params }: Props) {
  const id = params.id;
  return (
    <main className="min-h-[100svh] bg-deep text-white grid place-items-center p-6">
      <div className="max-w-[560px] w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/img/${id}.png`}
          alt={`Basebot #${id}`}
          className="w-full rounded-2xl border border-white/10 shadow-xl"
        />
      </div>
    </main>
  );
}
