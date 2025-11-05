// app/tamabot/[id]/page.tsx  (SERVER COMPONENT — no "use client")
import TamaBotClient from "@/components/TamaBotClient";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: { id: string } } | { params: Promise<{ id: string }> }) {
  // Handle Next 15's possibly-async params
  const p = "params" in props && typeof (props as any).params?.then === "function"
    ? await (props as { params: Promise<{ id: string }> }).params
    : (props as { params: { id: string } }).params;

  const idNum = Number(p?.id);
  const id = Number.isFinite(idNum) && idNum > 0 ? idNum : 0;

  return <TamaBotClient id={id} />;
}
