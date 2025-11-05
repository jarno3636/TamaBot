// app/debug-mini/page.tsx
import MiniProbe from "@/components/MiniProbe";

export const dynamic = "force-dynamic";

export default function DebugMiniPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <MiniProbe />
    </main>
  );
}
