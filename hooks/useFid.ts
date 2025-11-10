// hooks/useFid.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMiniContext } from "@/lib/useMiniContext";
import { detectedFIDString, rememberFID } from "@/lib/fid";

function isValidFID(v: unknown): v is number | string {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

export type FidSource = "context" | "query" | "storage" | "none";

export default function useFid() {
  const { fid: ctxFid } = useMiniContext();
  const [fid, setFid] = useState<string>("");
  const [source, setSource] = useState<FidSource>("none");

  // One-time read of query/storage on first mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const fromQuery =
      sp.get("fid") || sp.get("viewerFid") || sp.get("userFid") || "";

    if (isValidFID(fromQuery)) {
      setFid(String(fromQuery));
      setSource("query");
      rememberFID(fromQuery);
      return;
    }

    const fromStorage = detectedFIDString();
    if (isValidFID(fromStorage)) {
      setFid(String(fromStorage));
      setSource("storage");
    }
  }, []);

  // React to MiniContext after SDK/host is ready
  useEffect(() => {
    if (isValidFID(ctxFid)) {
      const s = String(ctxFid);
      setFid(s);
      setSource("context");
      rememberFID(s);
    }
  }, [ctxFid]);

  // Always return a normalized number when possible
  const fidNum = useMemo(() => {
    const n = Number(fid);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [fid]);

  return { fid, fidNum, setFid, source };
}
