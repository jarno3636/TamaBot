// app/bot/[id]/opengraph-image.tsx
import { ImageResponse } from "next/og";
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image({ params }: { params: { id: string } }) {
  const origin = (process.env.NEXT_PUBLIC_URL || "").replace(/\/$/, "");
  const id = (params.id || "").replace(/[^\d]/g, "");
  const cardUrl = (origin ? `${origin}` : "") + `/api/card/${id}`;

  return new ImageResponse(
    <img src={cardUrl} width={1200} height={630} alt={`Basebot #${id}`} />,
    size
  );
}
