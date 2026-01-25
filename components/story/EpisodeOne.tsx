"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import {
  BASEBOTS_SEASON2_STATE_ADDRESS,
  BASEBOTS_SEASON2_STATE_ABI,
} from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Types & enums */
/* ────────────────────────────────────────────── */

export type EpisodeOneChoiceId = "ACCEPT" | "STALL" | "SPOOF" | "PULL_PLUG";

const EP1_ENUM: Record<EpisodeOneChoiceId, number> = {
  ACCEPT: 0,
  STALL: 1,
  SPOOF: 2,
  PULL_PLUG: 3,
};

const EP1_FROM_ENUM: Record<number, EpisodeOneChoiceId> = {
  0: "ACCEPT",
  1: "STALL",
  2: "SPOOF",
  3: "PULL_PLUG",
};

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

export default function EpisodeOne({
  tokenId,
  onExit,
}: {
  tokenId: string | number | bigint;
  onExit: () => void;
}) {
  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const isBase = chain?.id === 8453;
  const ready = Boolean(address && walletClient && publicClient && isBase);

  const [phase, setPhase] = useState<
    "intro" | "signal" | "local" | "localAfter" | "choice" | "ending"
  >("intro");

  const [localAction, setLocalAction] =
    useState<"PRESS" | "LEAVE" | "BACK" | null>(null);

  const [chainChoice, setChainChoice] =
    useState<EpisodeOneChoiceId | null>(null);

  const [status, setStatus] = useState("Booting…");
  const [chainChecked, setChainChecked] = useState(false);

  /* ───────── Ambient audio ───────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio("/audio/s1.mp3");
    a.loop = true;
    a.volume = 0.6;
    audioRef.current = a;
    a.play().catch(() => {});
    return () => {
      try {
        a.pause();
        a.src = "";
      } catch {}
    };
  }, []);

  /* ───────── Chain read (SAFE) ───────── */

  async function readChain() {
    if (!publicClient || !tokenIdBig) {
      setChainChecked(true);
      return;
    }

    try {
      setStatus("Reading chain…");
      const state: any = await publicClient.readContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "getBotState",
        args: [tokenIdBig],
      });

      if (state?.ep1Set) {
        const raw = state.ep1Choice;
        const n = typeof raw === "bigint" ? Number(raw) : Number(raw);
        if (n in EP1_FROM_ENUM) {
          setChainChoice(EP1_FROM_ENUM[n]);
          setPhase("ending");
          setStatus(`Recovered from chain`);
        }
      } else {
        setStatus("Awaiting designation");
      }
    } catch {
      setStatus("Chain unavailable");
    } finally {
      setChainChecked(true);
    }
  }

  useEffect(() => {
    readChain();
    const handler = () => readChain();
    window.addEventListener("basebots-progress-updated", handler);
    return () => window.removeEventListener("basebots-progress-updated", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, tokenIdBig]);

  /* ───────── Commit choice ───────── */

  async function commit(choice: EpisodeOneChoiceId) {
    if (!ready || !tokenIdBig) {
      alert("Connect wallet on Base (8453)");
      return;
    }

    try {
      setStatus("Submitting transaction…");
      const hash = await walletClient!.writeContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "setEpisode1",
        args: [tokenIdBig, EP1_ENUM[choice]],
      });

      await publicClient!.waitForTransactionReceipt({ hash });
      setChainChoice(choice);
      setPhase("ending");
      setStatus("Committed on-chain");

      window.dispatchEvent(new Event("basebots-progress-updated"));
    } catch {
      setStatus("Transaction failed");
      alert("Transaction failed or rejected");
    }
  }

  /* ───────────────────────── render ───────────────────────── */

  return (
    <section
      style={{
        minHeight: "100vh",
        padding: 24,
        color: "white",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.10), transparent 62%), #020617",
      }}
    >
      {/* BOOT CONSOLE (ALWAYS) */}
      <div
        style={{
          borderRadius: 22,
          padding: 16,
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontSize: 12,
        }}
      >
        tokenId: <b>{tokenIdBig?.toString() ?? "INVALID"}</b> •{" "}
        {isBase ? "Base" : "Wrong chain"} • {status}
      </div>

      {/* WAIT FOR CHAIN CHECK */}
      {!chainChecked && (
        <p style={{ marginTop: 24, opacity: 0.6 }}>
          Initializing memory substrate…
        </p>
      )}

      {chainChecked && phase === "intro" && (
        <div style={{ marginTop: 28 }}>
          <h1 style={{ fontSize: 30, fontWeight: 900 }}>AWAKENING</h1>
          <p style={{ marginTop: 12, opacity: 0.75 }}>
            Cold boot. No owner. No credentials.
          </p>
          <button onClick={() => setPhase("signal")} style={primary()}>
            Continue
          </button>
        </div>
      )}

      {phase === "signal" && (
        <div style={{ marginTop: 28 }}>
          <h2 style={title()}>SIGNAL DROP</h2>
          <p style={body()}>
            AUDIT GATE INITIALIZED — OPERATOR PROFILE REQUIRED
          </p>
          <button onClick={() => setPhase("local")} style={primary()}>
            Locate local terminal
          </button>
        </div>
      )}

      {phase === "local" && (
        <div style={{ marginTop: 28 }}>
          <h2 style={title()}>LOCAL CONTROL NODE</h2>
          <p style={body()}>A recessed panel marked MANUAL OVERRIDE.</p>

          <div style={{ display: "grid", gap: 10 }}>
            <button onClick={() => { setLocalAction("PRESS"); setPhase("localAfter"); }} style={primary()}>
              Press override
            </button>
            <button onClick={() => { setLocalAction("LEAVE"); setPhase("localAfter"); }} style={secondary()}>
              Leave it alone
            </button>
            <button onClick={() => { setLocalAction("BACK"); setPhase("localAfter"); }} style={secondary()}>
              Step back
            </button>
          </div>
        </div>
      )}

      {phase === "localAfter" && (
        <div style={{ marginTop: 28 }}>
          <h2 style={title()}>OVERRIDE REJECTED</h2>
          <p style={body()}>
            {localAction === "PRESS" && "You press. It refuses."}
            {localAction === "LEAVE" && "You hesitate. It activates anyway."}
            {localAction === "BACK" && "Distance does not cancel the audit."}
          </p>
          <button onClick={() => setPhase("choice")} style={primary()}>
            Open audit prompt
          </button>
        </div>
      )}

      {phase === "choice" && (
        <div style={{ marginTop: 28 }}>
          <h2 style={title()}>AUDIT PROMPT</h2>
          <div style={{ display: "grid", gap: 10 }}>
            {(["ACCEPT", "STALL", "SPOOF", "PULL_PLUG"] as EpisodeOneChoiceId[]).map(
              (c) => (
                <button key={c} onClick={() => commit(c)} style={secondary()}>
                  {c}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {phase === "ending" && chainChoice && (
        <div style={{ marginTop: 28 }}>
          <h2 style={title()}>AUDIT RESULT</h2>
          <p style={body()}>
            Decision recorded on-chain: <b>{chainChoice}</b>
          </p>
          <button onClick={onExit} style={primary()}>
            Return to hub
          </button>
        </div>
      )}
    </section>
  );
}

/* ───────── styles ───────── */

const title = () => ({ fontSize: 22, fontWeight: 900 });
const body = () => ({ marginTop: 10, fontSize: 14, opacity: 0.75, lineHeight: 1.6 });
const primary = () => ({
  marginTop: 18,
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 900,
  background: "linear-gradient(90deg,#38bdf8,#a855f7)",
  color: "#020617",
  border: "none",
});
const secondary = () => ({
  borderRadius: 999,
  padding: "12px 18px",
  fontWeight: 800,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.14)",
  color: "white",
});
