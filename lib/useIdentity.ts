// lib/useIdentity.ts
"use client";

import { useMiniContext } from "@/lib/useMiniContext";
import { useMemo } from "react";

export function useIdentity() {
  const mini = useMiniContext();

  const fid = useMemo(() => {
    const raw = mini?.fid ?? mini?.user?.fid;
    if (typeof raw === "number" && raw > 0) return String(raw);
    if (typeof raw === "string" && /^\d+$/.test(raw)) return raw;
    return null;
  }, [mini]);

  return { fid, hasIdentity: Boolean(fid) };
}
