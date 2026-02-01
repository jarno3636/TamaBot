"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Storage */
/* ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";

/* ────────────────────────────────────────────── */
/* Types */
/* ────────────────────────────────────────────── */

type Ep1Save = {
  choiceId: "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";
  profile?: { archetype?: string };
};

type Phase = "descent" | "input" | "binding" | "approach";

/* ────────────────────────────────────────────── */
/* Helpers */
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
/* Component */
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

  /* IMPORTANT: trust wagmi, not walletClient.chain */
  const isBase = chain?.id === 8453;

  const ready =
    Boolean(address && publicClient && walletClient && isBase && tokenIdBig);

  /* ───────── read on-chain EP2 state ───────── */
  useEffect(() => {
    if (!publicClient || !tokenIdBig) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading designation state…");

        const state: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig],
        });

        const ep2Set =
          state?.ep2Set ??
          state?.episode2Set ??
          (Array.isArray(state) ? state[2] : false);

        if (!cancelled && ep2Set) {
          setAlreadySet(true);
          setPhase("approach");
          setChainStatus("Designation already bound");
        } else if (!cancelled) {
          setChainStatus("Awaiting designation");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, tokenIdBig]);

  /* ───────── commit designation ───────── */
  async function commit() {
    if (submitting || alreadySet) return;

    if (!ready) {
      setError("CONNECT WALLET ON BASE");
      return;
    }

    const err = validateDesignation(value);
    if (err) {
      setError(err);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
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
      setError(
        e?.shortMessage ||
          e?.message ||
          "TRANSACTION REJECTED"
      );
      setChainStatus("Transaction failed");
    } finally {
      setSubmitting(false);
    }
  }

  /* ────────────────────────────────────────────── */
  /* Render */
  /* ────────────────────────────────────────────── */

  return (
    <section
      style={{
        borderRadius: 28,
        padding: 24,
        color: "white",
        border: "1px solid rgba(168,85,247,0.35)",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.72))",
        boxShadow: "0 0 80px rgba(168,85,247,0.45)",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.75 }}>
        {chainStatus}
      </div>

      {phase === "descent" && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 900 }}>
            VERTICAL TRANSFER
          </h2>

          <p style={{ marginTop: 10, opacity: 0.75, lineHeight: 1.6 }}>
            Your prior posture propagates upward.
            <br />
            Oversight cross-references the pattern you left behind.
          </p>

          <p style={{ marginTop: 10, opacity: 0.9 }}>
            Archetype detected:
            <br />
            <b>{ep1?.profile?.archetype ?? "UNRESOLVED"}</b>
          </p>

          <button
            onClick={() => setPhase("input")}
            style={primaryBtn}
          >
            Continue
          </button>
        </>
      )}

      {phase === "input" && (
        <>
          <h2 style={{ fontSize: 24, fontWeight: 900 }}>
            ASSIGN DESIGNATION
          </h2>

          <p style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.6 }}>
            Upper systems require a stable identifier.
            <br />
            This value will persist across all future audits.
          </p>

          <input
            value={value}
            onChange={(e) => {
              setError(null);
              setValue(e.target.value.toUpperCase());
            }}
            maxLength={7}
            style={inputStyle}
          />

          {error && (
            <div style={{ color: "#fca5a5", fontSize: 12, marginTop: 8 }}>
              {error}
            </div>
          )}

          <button
            onClick={commit}
            disabled={submitting || alreadySet}
            style={{
              ...primaryBtn,
              opacity: submitting || alreadySet ? 0.5 : 1,
            }}
          >
            {submitting ? "CONFIRMING…" : "CONFIRM DESIGNATION"}
          </button>
        </>
      )}

      {phase === "binding" && (
        <div
          style={{
            marginTop: 48,
            textAlign: "center",
            fontFamily: "monospace",
            letterSpacing: 2,
            opacity: 0.9,
          }}
        >
          IDENTITY LOCKED
        </div>
      )}

      {phase === "approach" && (
        <>
          <p style={{ opacity: 0.8, lineHeight: 1.6 }}>
            Designation accepted.
            <br />
            Oversight now recognizes continuity.
          </p>

          <button onClick={onExit} style={secondaryBtn}>
            Return to hub
          </button>
        </>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */
/* ────────────────────────────────────────────── */

const primaryBtn: React.CSSProperties = {
  marginTop: 24,
  padding: "12px 22px",
  borderRadius: 999,
  fontWeight: 900,
  background:
    "linear-gradient(90deg, rgba(56,189,248,0.9), rgba(168,85,247,0.9))",
  color: "#020617",
  boxShadow: "0 0 24px rgba(168,85,247,0.6)",
};

const secondaryBtn: React.CSSProperties = {
  marginTop: 28,
  padding: "10px 20px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.18)",
  color: "white",
};

const inputStyle: React.CSSProperties = {
  marginTop: 18,
  width: "100%",
  padding: "14px",
  textAlign: "center",
  fontSize: 18,
  letterSpacing: 4,
  borderRadius: 16,
  background: "rgba(0,0,0,0.45)",
  border: "1px solid rgba(168,85,247,0.45)",
  color: "white",
};
