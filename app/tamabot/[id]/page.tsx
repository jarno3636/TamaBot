// app/tamabot/[id]/page.tsx  (SERVER COMPONENT — no "use client")
import TamaBotClient from "@/components/TamaBotClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;                 // ✅ Next 15-friendly
  const idNum = Number(p?.id);
  const id = Number.isFinite(idNum) && idNum > 0 ? idNum : 0;

  return <TamaBotClient id={id} />;
}
