"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Constants */
/* ────────────────────────────────────────────── */

const BASE_CHAIN_ID = 8453;
const SOUND_KEY = "basebots_ep5_sound";

/* ────────────────────────────────────────────── */
/* Outcome enum (MUST MATCH CONTRACT ORDER) */
/*
enum Outcome {
  NONE,
  AUTHORIZED,
  OBSERVED,
  SILENT,
  UNTRACKED,
  FLAGGED
}
*/
/* ────────────────────────────────────────────── */

const OUTCOME_ENUM: Record<string, number> = {
  AUTHORIZED: 1,
  OBSERVED: 2,
  SILENT: 3,
  UNTRACKED: 4,
  FLAGGED: 5,
};

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function deriveOutcomeEnum(ep1: number, profile: number): number {
  // ep1Choice: 1..4 (ACCEPT, STALL, SPOOF, PULL_PLUG)
  // profile: 1..4 (EXECUTOR, OBSERVER, OPERATOR, SENTINEL)

  if (ep1 === 4) return OUTCOME_ENUM.UNTRACKED; // PULL_PLUG
  if (ep1 === 3) return OUTCOME_ENUM.SILENT;    // SPOOF
  if (profile === 4) return OUTCOME_ENUM.FLAGGED; // SENTINEL
  if (profile === 2) return OUTCOME_ENUM.OBSERVED; // OBSERVER
  return OUTCOME_ENUM.AUTHORIZED;
}

function outcomeLabel(v: number): string {
  return Object.keys(OUTCOME_ENUM).find(k => OUTCOME_ENUM[k] === v) ?? "UNKNOWN";
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeFive({
  fid,
  onExit,
}: {
  fid: string | number | bigint;
  onExit: () => void;
}) {
  const fidBig = useMemo(() => BigInt(fid), [fid]);

  /* wagmi */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const isBase = chain?.id === BASE_CHAIN_ID;

  /* state */
  const [ep1Choice, setEp1Choice] = useState<number | null>(null);
  const [profile, setProfile] = useState<number | null>(null);
  const [alreadyFinalized, setAlreadyFinalized] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");
  const [submitting, setSubmitting] = useState(false);

  /* sound */
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });

  /* ────────────────────────────────────────────── */
  /* Sound */
/* ────────────────────────────────────────────── */

  useEffect(() => {
    const a = new Audio("/audio/s5.mp3");
    a.loop = true;
    a.volume = 0.45;
    audioRef.current = a;
    if (soundOn) a.play().catch(() => {});
    return () => {
      a.pause();
      a.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (soundOn) a.play().catch(() => {});
    else {
      a.pause();
      a.currentTime = 0;
    }
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
    } catch {}
  }, [soundOn]);

  /* ────────────────────────────────────────────── */
  /* Read chain */
/* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!publicClient) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading final state…");

        const s: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [fidBig],
        });

        if (cancelled) return;

        setEp1Choice(Number(s.ep1Choice));
        setProfile(Number(s.profile));

        if (s.ep5Set) {
          setAlreadyFinalized(true);
          setChainStatus("Outcome finalized");
        } else {
          setChainStatus("Outcome pending");
        }
      } catch (e: any) {
        if (!cancelled) {
          setChainStatus(e?.shortMessage || e?.message || "Chain read failed");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, fidBig]);

  const outcomeEnum = useMemo(() => {
    if (ep1Choice == null || profile == null) return null;
    return deriveOutcomeEnum(ep1Choice, profile);
  }, [ep1Choice, profile]);

  /* ────────────────────────────────────────────── */
  /* Finalize */
/* ────────────────────────────────────────────── */

  async function finalize() {
    if (alreadyFinalized || submitting) return;
    if (!address) {
      setChainStatus("Connect wallet");
      return;
    }
    if (outcomeEnum == null) {
      setChainStatus("Outcome not derivable");
      return;
    }

    try {
      setSubmitting(true);

      if (!isBase) {
        setChainStatus("Switching to Base…");
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      setChainStatus("Awaiting signature…");

      const hash = await writeContractAsync({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "finalize",
        args: [fidBig, outcomeEnum],
      });

      setChainStatus("Finalizing on-chain…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));
      setAlreadyFinalized(true);
      setChainStatus("Outcome committed");
    } catch (e: any) {
      setChainStatus(e?.shortMessage || e?.message || "Finalization failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
/* ────────────────────────────────────────────── */

  return (
    <section style={container}>
      <div style={{ fontSize: 11, opacity: 0.75 }}>
        fid: <b>{fidBig.toString()}</b> • chain:{" "}
        <b>{isBase ? "Base" : chain?.id ?? "none"}</b> • status:{" "}
        <b>{chainStatus}</b>
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
        <button onClick={() => setSoundOn(s => !s)} style={controlBtn}>
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button onClick={onExit} style={controlBtn}>
          Exit
        </button>
      </div>

      <h2 style={{ marginTop: 18, fontSize: 20, fontWeight: 900 }}>
        FINAL COMMIT
      </h2>

      <div style={{ marginTop: 18, fontSize: 14, opacity: 0.88 }}>
        {outcomeEnum !== null && (
          <>
            <p>System synthesis complete.</p>
            <p style={quote}>
              “Outcome classified: {outcomeLabel(outcomeEnum)}”
            </p>
          </>
        )}
      </div>

      <div style={outcomeBox}>
        {outcomeEnum ? outcomeLabel(outcomeEnum) : "PENDING"}
      </div>

      {!alreadyFinalized && (
        <button
          onClick={finalize}
          disabled={submitting || outcomeEnum == null}
          style={primaryBtn}
        >
          {submitting ? "FINALIZING…" : "Finalize outcome"}
        </button>
      )}

      <button onClick={onExit} style={exitBtn}>
        Return to hub
      </button>
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */
/* ────────────────────────────────────────────── */

const container = {
  position: "relative" as const,
  overflow: "hidden",
  borderRadius: 28,
  border: "1px solid rgba(255,255,255,0.14)",
  padding: 26,
  color: "white",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.78))",
  boxShadow: "0 70px 260px rgba(0,0,0,0.95)",
};

const controlBtn = {
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.2)",
  padding: "4px 10px",
  fontSize: 11,
  background: "rgba(255,255,255,0.04)",
  color: "white",
};

const outcomeBox = {
  marginTop: 22,
  borderRadius: 18,
  padding: "14px",
  fontFamily: "monospace",
  fontSize: 13,
  letterSpacing: 2,
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(255,255,255,0.18)",
  textAlign: "center" as const,
};

const quote = {
  marginTop: 14,
  fontSize: 12,
  fontStyle: "italic" as const,
  opacity: 0.65,
};

const primaryBtn = {
  marginTop: 18,
  width: "100%",
  padding: "12px 18px",
  borderRadius: 999,
  fontWeight: 900,
  background: "linear-gradient(90deg,#38bdf8,#a855f7)",
  color: "#020617",
};

const exitBtn = {
  marginTop: 18,
  borderRadius: 999,
  padding: "8px 18px",
  fontSize: 12,
  fontWeight: 800,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.04)",
  color: "white",
};
