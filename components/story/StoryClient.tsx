"use client";

import { useEffect, useState } from "react";
import useFid from "@/hooks/useFid";
import StoryReader from "./StoryReader";

function isValidFID(v: string | number | undefined) {
  if (!v) return false;
  const n = Number(v);
  return Number.isInteger(n) && n > 0;
}

export default function StoryClient() {
  const { fid } = useFid();
  const [fidNum, setFidNum] = useState<number | null>(null);

  // 🚧 HARD GATE — no wagmi hooks above this line
  useEffect(() => {
    if (isValidFID(fid)) {
      setFidNum(Number(fid));
    }
  }, [fid]);

  if (fidNum === null) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Waiting for identity…
      </div>
    );
  }

  // ✅ wagmi hooks are now isolated
  return <StoryReader fidNum={fidNum} />;
}
