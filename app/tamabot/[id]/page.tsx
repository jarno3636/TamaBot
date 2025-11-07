// app/tamabot/[id]/page.tsx
import { TAMABOT_CORE } from "@/lib/abi";
import PetCard from "@/components/PetCard";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const idNum = Number(p?.id);
  const id = Number.isFinite(idNum) && idNum > 0 ? idNum : 0;

  // Directly use your metadata API (no extra hero image / debug links)
  const metadataUrl = `/api/metadata/base/${TAMABOT_CORE.address}/${id}.json`;

  return (
    <main className="min-h-[100svh] bg-deep-orange">
      <div className="mx-auto max-w-md w-full px-4 py-6 flex items-start justify-center">
        <div className="w-full">
          {/* A single, centered card with the pet’s info */}
          <PetCard metadataUrl={metadataUrl} />
        </div>
      </div>
    </main>
  );
}
