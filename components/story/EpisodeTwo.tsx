"use client";

import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import {
  BASEBOTS_SEASON2_STATE_ADDRESS,
  BASEBOTS_SEASON2_STATE_ABI,
} from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function normalizeFid(input: string | number | bigint): bigint {
  try {
    return typeof input === "bigint" ? input : BigInt(input);
  } catch {
    return 0n;
  }
}

function isValidDesignation(input: string) {
  return /^[A-Z0-9]{7}$/.test(input);
}

function toBytes7(input: string): `0x${string}` {
  const padded = input.padEnd(7, "\0");
  return (
    "0x" +
    Array.from(padded)
      .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
      .join("")
  ) as `0x${string}`;
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeTwo({
  fid,
  onExit,
}: {
  fid: string | number | bigint;
  onExit: () => void;
}) {
  const fidBig = useMemo(() => normalizeFid(fid), [fid]);

  const { address, chain } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const isBase = chain?.id === 8453;

  /* ───────── State ───────── */

  const [designation, setDesignation] = useState("");
  const [phase, setPhase] = useState<
    "intro" | "input" | "confirm" | "sealing" | "done"
  >("intro");

  const [status, setStatus] = useState("Awaiting input");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidDesignation(designation);

  const needsWallet =
    phase === "sealing" &&
    (!walletClient || !publicClient || !isBase || !address);

  /* ───────── Commit ───────── */

  async function commitDesignation() {
    try {
      setStatus("Locking designation…");

      const hash = await walletClient!.writeContract({
        address: BASEBOTS_SEASON2_STATE_ADDRESS,
        abi: BASEBOTS_SEASON2_STATE_ABI,
        functionName: "setEpisode2Designation",
        args: [fidBig, toBytes7(designation)],
      });

      setTxHash(hash);
      await publicClient!.waitForTransactionReceipt({ hash });

      setStatus("Designation locked");
      setPhase("done");
    } catch {
      setError("Transaction failed or was rejected.");
      setStatus("Lock failed");
      setPhase("input");
    }
  }

  useEffect(() => {
    if (phase === "sealing" && !needsWallet) {
      commitDesignation();
    }
  }, [phase, needsWallet]);

  /* ───────────────────────── render ───────────────────────── */

  return (
    <section style={shell}>
      <style>{css}</style>

      {needsWallet && (
        <div className="walletOverlay">
          <div className="walletCard glow">
            <div className="walletTitle">IDENTITY LOCK</div>
            <div className="walletBody">
              Your designation will be permanently bound to this FID.
            </div>
            <div className="pulse" />
          </div>
        </div>
      )}

      <div className="console">
        <span>FID {fidBig.toString()} • {status}</span>
      </div>

      {phase === "intro" && (
        <>
          <h1 className="title">DESIGNATION</h1>
          <p className="body">
            The system does not know what to call you yet.
            <br />
            Choose carefully. Names persist.
          </p>
          <button className="primary" onClick={() => setPhase("input")}>
            Assign designation
          </button>
        </>
      )}

      {phase === "input" && (
        <>
          <h2 className="title">ENTER DESIGNATION</h2>

          <input
            className={`input ${valid ? "valid" : ""}`}
            value={designation}
            onChange={(e) =>
              setDesignation(e.target.value.toUpperCase().slice(0, 7))
            }
            placeholder="7 CHARS (A–Z, 0–9)"
          />

          <div className="hint">
            {designation.length}/7 • {valid ? "VALID" : "INVALID"}
          </div>

          {error && <div className="error">{error}</div>}

          <button
            className="primary"
            disabled={!valid}
            onClick={() => setPhase("confirm")}
          >
            Continue
          </button>
        </>
      )}

      {phase === "confirm" && (
        <>
          <h2 className="title">CONFIRM IDENTITY</h2>
          <div className="designationCard glow">
            {designation}
          </div>

          <p className="body">
            This designation cannot be changed without a respec.
          </p>

          <button className="primary" onClick={() => setPhase("sealing")}>
            Lock designation
          </button>
        </>
      )}

      {phase === "done" && (
        <>
          <h2 className="title">IDENTITY SEALED</h2>

          <div className="designationCard glow">
            {designation}
          </div>

          {txHash && (
            <div className="hash">
              {txHash.slice(0, 10)}…
            </div>
          )}

          <button className="primary" onClick={onExit}>
            Continue
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
  minHeight: "100vh",
  padding: 24,
  color: "white",
  background: "#020617",
};

const css = `
.console{display:flex;justify-content:space-between;font-size:12px;opacity:.85}
.title{font-size:32px;font-weight:900}
.body{margin-top:12px;opacity:.86;max-width:720px}
.primary{margin-top:18px;padding:12px 18px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);font-weight:900}
.primary:disabled{opacity:.4}
.input{margin-top:18px;padding:16px;font-size:18px;letter-spacing:4px;border-radius:16px;background:#020617;border:1px solid rgba(255,255,255,.2);color:white;text-align:center}
.input.valid{border-color:#38bdf8;box-shadow:0 0 18px rgba(56,189,248,.4)}
.hint{margin-top:6px;font-size:12px;opacity:.7}
.designationCard{margin-top:18px;padding:24px;border-radius:20px;font-size:28px;letter-spacing:6px;text-align:center}
.glow{box-shadow:0 0 40px rgba(168,85,247,.6)}
.walletOverlay{position:fixed;inset:0;background:rgba(2,6,23,.92);display:flex;align-items:center;justify-content:center}
.walletCard{padding:24px;border-radius:22px;border:1px solid rgba(168,85,247,.45)}
.pulse{height:6px;border-radius:999px;background:linear-gradient(90deg,#38bdf8,#a855f7);animation:pulse 1.4s infinite}
@keyframes pulse{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}
.error{margin-top:10px;color:#fca5a5}
.hash{margin-top:10px;font-size:12px;opacity:.7}
`;
