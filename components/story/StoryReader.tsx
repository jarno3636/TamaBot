"use client";

import { useReadContract } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

export default function StoryReader({ fidNum }: { fidNum: number }) {
  const {
    data,
    error,
    isLoading,
  } = useReadContract({
    address: BASEBOTS_S2.address,
    abi: BASEBOTS_S2.abi,
    functionName: "getBotState",
    args: [BigInt(fidNum)],
  });

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-400">
        Contract read failed
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading story…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <pre className="opacity-80">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
