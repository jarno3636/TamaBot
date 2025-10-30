"use client";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { TAMABOT_CORE } from "@/lib/abi";

export function CareButtons({ id }: { id: number }) {
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const busy = isPending || confirming;

  function call(fn: "feed"|"play"|"clean"|"rest") {
    writeContract({ address: TAMABOT_CORE.address, abi: TAMABOT_CORE.abi, functionName: fn, args: [BigInt(id)] });
  }

  return (
    <div className="flex gap-2">
      {(["feed","play","clean","rest"] as const).map(k=> (
        <button key={k} disabled={busy} onClick={()=>call(k)}
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50">{k}</button>
      ))}
      {isSuccess && <span className="text-xs text-emerald-400">Done!</span>}
    </div>
  );
}
