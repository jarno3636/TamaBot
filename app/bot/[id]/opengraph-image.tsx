// app/bot/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";
export const runtime = "edge";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { id: string } }) {
  const id = (params.id || "").replace(/[^\d]/g, "");
  // Proxy to the API card (keeps one source of truth)
  const url = new URL(`/api/card/${id}`, process.env.NEXT_PUBLIC_URL).toString();
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new ImageResponse(buf as unknown as React.ReactElement, size);
}
