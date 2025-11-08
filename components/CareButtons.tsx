// components/CareButtons.tsx
"use client";

import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TAMABOT_CORE } from "@/lib/abi";

const LABEL: Record<"feed"|"play"|"clean"|"rest", string> = {
  feed:  "🍖 Feed",
  play:  "🎮 Play",
  clean: "🧽 Clean",
  rest:  "😴 Rest",
};

export function CareButtons({ id, onConfirmed }: { id: number; onConfirmed?: () => void }) {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => { if (isSuccess) onConfirmed?.(); }, [isSuccess, onConfirmed]);

  function call(fn: "feed"|"play"|"clean"|"rest") {
    writeContract({
      address: TAMABOT_CORE.address as `0x${string}`,
      abi: TAMABOT_CORE.abi,
      functionName: fn,
      args: [BigInt(id)],
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      {(["feed","play","clean","rest"] as const).map(k => (
        <button
          key={k}
          disabled={isPending || confirming}
          onClick={() => call(k)}
          className="btn-pill btn-pill--blue hover:brightness-110 disabled:opacity-60"
        >
          {LABEL[k]}
        </button>
      ))}
      {isSuccess && <span className="pill-note pill-note--green text-xs">Action confirmed</span>}
      {error && <span className="pill-note pill-note--red text-xs break-words">{String(error.message)}</span>}
    </div>
  );
}
