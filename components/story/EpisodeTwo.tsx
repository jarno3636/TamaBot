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

  /* wagmi */
  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const isBase = chain?.id === 8453;

  // IMPORTANT FIX: do NOT require walletClient here
  const ready =
    Boolean(address && publicClient && isBase && tokenIdBig);

  /* ───────── read EP2 state ───────── */
  useEffect(() => {
    if (!publicClient || !tokenIdBig) return;

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
      setChainStatus("Preparing transaction…");

      // simulate FIRST (forces gas estimation)
      const { request } = await publicClient!.simulateContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode2Designation",
        args: [tokenIdBig!, value],
        account: address!,
      });

      setChainStatus("Awaiting wallet signature…");

      // walletClient may resolve lazily here — this is OK
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
    <section style={shell}>
      <div style={{ fontSize: 11, opacity: 0.75 }}>{chainStatus}</div>

      {phase === "descent" && (
        <>
          <h2 style={title}>VERTICAL TRANSFER</h2>
          <p style={body}>
            Oversight reconstructs the pattern you left behind.
          </p>
          <p style={{ opacity: 0.9 }}>
            Archetype detected:
            <br />
            <b>{ep1?.profile?.archetype ?? "UNRESOLVED"}</b>
          </p>
          <button style={primaryBtn} onClick={() => setPhase("input")}>
            Continue
          </button>
        </>
      )}

      {phase === "input" && (
        <>
          <h2 style={title}>ASSIGN DESIGNATION</h2>
          <p style={body}>
            This identifier will persist across all audits.
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

          {error && <div style={errorStyle}>{error}</div>}

          <button
            style={{
              ...primaryBtn,
              opacity: submitting || alreadySet ? 0.5 : 1,
            }}
            disabled={submitting || alreadySet}
            onClick={commit}
          >
            {submitting ? "CONFIRMING…" : "CONFIRM DESIGNATION"}
          </button>
        </>
      )}

      {phase === "binding" && (
        <div style={mono}>IDENTITY LOCKED</div>
      )}

      {phase === "approach" && (
        <>
          <p style={body}>
            Designation accepted.
            <br />
            Oversight now recognizes continuity.
          </p>
          <button style={secondaryBtn} onClick={onExit}>
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

const shell: React.CSSProperties = {
  borderRadius: 28,
  padding: 24,
  color: "white",
  border: "1px solid rgba(168,85,247,0.35)",
  background:
    "linear-gradient(180deg, rgba(2,6,23,0.96), rgba(2,6,23,0.72))",
  boxShadow: "0 0 80px rgba(168,85,247,0.45)",
};

const title = { fontSize: 24, fontWeight: 900 };
const body = { marginTop: 10, opacity: 0.75, lineHeight: 1.6 };
const mono = {
  marginTop: 48,
  textAlign: "center",
  fontFamily: "monospace",
  letterSpacing: 2,
};

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

const errorStyle = {
  color: "#fca5a5",
  fontSize: 12,
  marginTop: 8,
};
