// app/tamabot/[id]/page.tsx
import MetaPreview from "@/components/MetaPreview";
import TamaBotClient from "@/components/TamaBotClient";
import { TAMABOT_CORE } from "@/lib/abi";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const idNum = Number(p?.id);
  const id = Number.isFinite(idNum) && idNum > 0 ? idNum : 0;

  // Build the metadata URL that corresponds to the NFT
  const metadataUrl = `/api/metadata/base/${TAMABOT_CORE.address}/${id}.json`;

  return (
    <div className="flex flex-col gap-6 items-center justify-center min-h-screen px-4">
      {/* NFT Metadata Preview */}
      <MetaPreview id={id} />

      {/* Pass the same ID into your client-controlled component */}
      <TamaBotClient id={id} />

      {/* Optional: link to raw metadata for debugging */}
      <a
        href={metadataUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-zinc-400 hover:text-zinc-200 mt-4"
      >
        View metadata JSON
      </a>
    </div>
  );
}
