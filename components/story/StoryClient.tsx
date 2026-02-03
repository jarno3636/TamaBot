"use client";

import { useEffect, useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import useFid from "@/hooks/useFid";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

export default function StoryClient() {
  const { fid } = useFid();

  // ✅ CRITICAL: stabilize FID BEFORE wagmi
  const [fidNum, setFidNum] = useState<number | null>(null);

  useEffect(() => {
    if (isValidFID(fid)) {
      setFidNum(Number(fid));
    }
  }, [fid]);

  const fidBigInt = useMemo(
    () => (fidNum !== null ? BigInt(fidNum) : null),
    [fidNum],
  );

  const {
    data,
    error,
    isLoading,
  } = useReadContract({
    ...BASEBOTS_S2,
    functionName: "getBotState",
    args: fidNum !== null ? ([fidBigInt] as [bigint]) : undefined,
    query: { enabled: fidNum !== null },
  });

  if (fidNum === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Detecting identity…
      </div>
    );
  }

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

  // ✅ safe to render now
  return (
    <div className="min-h-screen bg-[#020617] text-white p-6">
      <pre className="opacity-80">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
