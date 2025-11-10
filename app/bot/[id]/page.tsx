import type { Metadata } from "next";

// generateMetadata: params is a Promise in Next 15's PageProps
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
  const { id: idParam } = await params;
  const id = (idParam || "").replace(/[^\d]/g, "");

  const origin = (process.env.NEXT_PUBLIC_URL || "https://your-site.example").replace(/\/$/, "");
  const title = `Basebot #${id}`;
  const desc = "Basebots — on-chain FID bots with HD cel-shaded render.";
  const ogImg = `${origin}/api/card/${id}.png`; // 1200x630 social card

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      type: "website",
      images: [{ url: ogImg, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImg],
    },
  };
}

// Page component: also await params
export default async function BotPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: idParam } = await params;
  const id = (idParam || "").replace(/[^\d]/g, "");

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
