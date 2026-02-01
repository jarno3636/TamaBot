"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ──────────────────────────────────────────────
 * Storage keys
 * ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep2_sound";

/* ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
  profile?: { archetype?: string };
};

type Phase = "descent" | "input" | "binding" | "approach";

/* ────────────────────────────────────────────── */

function loadEp1(): Ep1Save | null {
  try {
    const raw = localStorage.getItem(EP1_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function validateDesignation(v: string) {
  if (!/^[A-Z0-9]+$/.test(v)) return "ONLY A–Z AND 0–9 ALLOWED";
  if (v.length !== 7) return "DESIGNATION MUST BE EXACTLY 7 CHARACTERS";
  return null;
}

function normalizeTokenId(input: string | number | bigint): bigint | null {
  try {
    return typeof input === "bigint"
      ? input
      : BigInt(String(input).trim());
  } catch {
    return null;
  }
}

/* ────────────────────────────────────────────── */

export default function EpisodeTwo({
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);
  const ep1 = useMemo(() => loadEp1(), []);

  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [alreadySet, setAlreadySet] = useState(false);
  const [chainStatus, setChainStatus] = useState("Idle");

  /* ───────── wagmi ───────── */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const isBase =
    chain?.id === 8453 && walletClient?.chain?.id === 8453;

  const ready =
    Boolean(address && walletClient && publicClient && isBase && tokenIdBig);

  /* ───────── read ep2 state ───────── */
  useEffect(() => {
    if (!publicClient || !tokenIdBig) return;

    (async () => {
      try {
        setChainStatus("Reading chain…");

        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig],
        });

        const ep2Set = state?.ep2Set ?? state?.episode2Set;

        if (ep2Set) {
          setAlreadySet(true);
          setPhase("approach");
          setChainStatus("Designation already bound");
        } else {
          setChainStatus("Awaiting designation");
        }
      } catch {
        setChainStatus("Chain read failed");
      }
    })();
  }, [publicClient, tokenIdBig]);

  /* ───────── commit designation (FIXED) ───────── */
  async function commit() {
    if (!ready || submitting || alreadySet) return;

    const err = validateDesignation(value);
    if (err) {
      setError(err);
      return;
    }

    try {
      setSubmitting(true);
      setChainStatus("Simulating commitment…");

      const { request } = await publicClient!.simulateContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode2Designation",
        args: [tokenIdBig!, value],
        account: address!,
      });

      setChainStatus("Awaiting signature…");

      const hash = await walletClient!.writeContract(request);

      setChainStatus("Finalizing on-chain…");
      await publicClient!.waitForTransactionReceipt({ hash });

      window.dispatchEvent(new Event("basebots-progress-updated"));

      setPhase("binding");
      setTimeout(() => setPhase("approach"), 1400);
      setChainStatus("Designation committed");
    } catch (e: any) {
      console.error(e);
      setError(
        e?.shortMessage ||
          e?.message ||
          "COMMITMENT REJECTED"
      );
      setChainStatus("Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */

  return (
    <section
      style={{
        borderRadius: 28,
        padding: 22,
        color: "white",
        border: "1px solid rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.72))",
        boxShadow: "0 40px 160px rgba(0,0,0,0.85)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.7 }}>
        Status: <b>{chainStatus}</b>
      </div>

      {phase === "descent" && (
        <>
          <h2>VERTICAL TRANSFER</h2>
          <p>
            Prior classification propagates:{" "}
            <b>{ep1?.profile?.archetype ?? "UNRESOLVED"}</b>
          </p>
          <button onClick={() => setPhase("input")}>Continue</button>
        </>
      )}

      {phase === "input" && (
        <>
          <h2>ASSIGN DESIGNATION</h2>
          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            style={{ letterSpacing: 4, textAlign: "center" }}
          />

          {error && <div style={{ color: "#f87171" }}>{error}</div>}

          <button onClick={commit} disabled={submitting || alreadySet}>
            {submitting ? "CONFIRMING…" : "CONFIRM DESIGNATION"}
          </button>
        </>
      )}

      {phase === "binding" && (
        <div style={{ fontFamily: "monospace" }}>
          IDENTITY LOCKED
        </div>
      )}

      {phase === "approach" && (
        <>
          <p>Designation accepted.</p>
          <button onClick={onExit}>Return to hub</button>
        </>
      )}
    </section>
  );
}
