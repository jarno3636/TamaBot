// components/CareButtons.tsx
"use client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TAMABOT_CORE } from "@/lib/abi";

const LABEL: Record<"feed"|"play"|"clean"|"rest", string> = {
  feed:  "🍖 Feed",
  play:  "🎮 Play",
  clean: "🧽 Clean",
  rest:  "😴 Rest",
};

export function CareButtons({ id }: { id: number }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || confirming;

  function call(fn: "feed"|"play"|"clean"|"rest") {
    writeContract({
      address: TAMABOT_CORE.address,
      abi: TAMABOT_CORE.abi,
      functionName: fn,
      args: [BigInt(id)],
    });
  }

  // ✅ when confirmed, tell the page to refresh state
  if (isSuccess) {
    setTimeout(() => {
      window.dispatchEvent(new Event("tamabot:action_confirmed"));
    }, 0);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {(["feed","play","clean","rest"] as const).map(k=> (
        <button
          key={k}
          disabled={busy}
          onClick={()=>call(k)}
          className="btn-pill btn-pill--blue hover:brightness-110 disabled:opacity-60"
        >
          {LABEL[k]}
        </button>
      ))}
      {isSuccess && <span className="pill-note pill-note--green text-xs">Action confirmed</span>}
    </div>
  );
}
