// app/tamabot/[id]/page.tsx
import { TAMABOT_CORE } from "@/lib/abi";
import PetView from "@/components/PetView";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const idNum = Number(p?.id);
  const id = Number.isFinite(idNum) && idNum > 0 ? idNum : 0;

  const metadataUrl = `/api/metadata/base/${TAMABOT_CORE.address}/${id}.json`;

  return (
    <main className="min-h-[100svh] bg-deep-orange">
      <div className="mx-auto max-w-md w-full px-4 py-6 flex justify-center">
        <PetView id={id} metadataUrl={metadataUrl} />
      </div>
    </main>
  );
}
