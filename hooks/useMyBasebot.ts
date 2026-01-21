"use client";

import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { BASEBOTS } from "@/lib/abi";

function isValidFID(v: number | null | undefined) {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

function b64ToUtf8(b64: string): string {
  try {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(b64), (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
  } catch {
    try {
      return atob(b64);
    } catch {
      return "";
    }
  }
}

export function useMyBasebot(fid?: number | null) {
  const enabled = isValidFID(fid);

  const { data, isLoading, isError } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: enabled ? ([fid] as unknown as [bigint]) : undefined,
    query: { enabled },
  });

  const decoded = useMemo(() => {
    if (typeof data !== "string") return null;
    if (!data.startsWith("data:application/json;base64,")) return null;

    try {
      const b64 = data.split(",")[1] || "";
      return JSON.parse(b64ToUtf8(b64));
    } catch {
      return null;
    }
  }, [data]);

  return {
    exists: Boolean(decoded),      // ✅ THIS IS YOUR GATE
    loading: isLoading,
    error: isError,
    metadata: decoded,
    image: decoded?.image ?? "",
    name: decoded?.name ?? "",
    description: decoded?.description ?? "",
  };
}
