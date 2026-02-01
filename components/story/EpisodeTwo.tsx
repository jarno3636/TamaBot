"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Helpers */
/* ────────────────────────────────────────────── */

function normalizeFid(input: string | number | bigint): bigint {
  try {
    if (typeof input === "bigint") return input > 0n ? input : 0n;
    if (typeof input === "number") return input > 0 ? BigInt(Math.floor(input)) : 0n;
    const digits = String(input).match(/\d+/)?.[0];
    if (!digits) return 0n;
    const b = BigInt(digits);
    return b > 0n ? b : 0n;
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

  const [phase, setPhase] = useState<
    "boot" | "context" | "input" | "confirm" | "sealing" | "done"
  >("boot");

  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("Awaiting identity assignment…");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const valid = isValidDesignation(designation);

  const needsWallet =
    phase === "sealing" &&
    (!walletClient || !publicClient || !isBase || !address);

  /* ───────── Commit ───────── */

  async function commitDesignation() {
    if (!walletClient || !publicClient) return;

    try {
      setError(null);
      setStatus("Binding designation to identity…");

      const hash = await walletClient.writeContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode2Designation",
        args: [fidBig, toBytes7(designation)],
      });

      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });

      setStatus("Identity sealed");
      setPhase("done");
    } catch (e: any) {
      setError(
        e?.shortMessage ||
          e?.message ||
          "Transaction failed or was rejected."
      );
      setStatus("Seal interrupted");
      setPhase("input");
    }
  }

  useEffect(() => {
    if (phase === "sealing" && !needsWallet) {
      commitDesignation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, needsWallet]);

  /* ───────────────────────── Render ───────────────────────── */

  return (
    <section style={shell}>
      <style>{css}</style>

      <div className="bgGlow" />
      <div className="scanlines" />
      <div className="vignette" />

      {needsWallet && (
        <div className="walletOverlay">
          <div className="walletCard">
            <div className="walletTitle">IDENTITY LOCK</div>
            <div className="walletBody">
              Your designation will be permanently bound to this FID.
              <br />
              Connect wallet and switch to <b>Base</b> to continue.
            </div>
            <div className="walletMeta">
              fid: <b>{fidBig.toString()}</b> • chain:{" "}
              <b>{isBase ? "8453" : String(chain?.id ?? "none")}</b>
            </div>
            <div className="pulse" />
          </div>
        </div>
      )}

      <div className="card">
        <div className="chrome" />

        <div className="console">
          <span>
            fid <b>{fidBig.toString()}</b> •{" "}
            <b>{isBase ? "BASE" : "WRONG CHAIN"}</b> • {status}
          </span>
        </div>

        {/* ───── BOOT ───── */}
        {phase === "boot" && (
          <>
            <div className="badgeRow">
              <div className="chip">EP2</div>
              <div className="chip chipPurple">IDENTITY ASSIGNMENT</div>
            </div>

            <h1 className="title">DESIGNATION</h1>

            <p className="body">
              The system can track your behavior.
              <br />
              It can replay your decisions.
              <br />
              <br />
              What it cannot do yet is <b>address you</b>.
              <br />
              <br />
              Oversight requires a stable identifier — something short,
              repeatable, and difficult to forget.
            </p>

            <div className="divider" />

            <p className="body soft">
              <i>
                “This designation will be referenced in audits, reports, and
                incident summaries. Choose something you can stand behind.”
              </i>
            </p>

            <button className="primary" onClick={() => setPhase("context")}>
              Continue
            </button>
          </>
        )}

        {/* ───── CONTEXT ───── */}
        {phase === "context" && (
          <>
            <div className="badgeRow">
              <div className="chip">OVERSIGHT</div>
              <div className="chip chipDim">NAMING PROTOCOL</div>
            </div>

            <h2 className="titleSm">WHY NAMES MATTER</h2>

            <p className="body">
              Designations aren’t just labels.
              <br />
              They’re compression.
              <br />
              <br />
              When the system talks about you internally, it will not replay your
              history — it will reference your designation and assume the rest.
              <br />
              <br />
              A weak name becomes shorthand for weak outcomes.
            </p>

            <div className="subPanel">
              <div className="subTitle">CONSTRAINTS</div>
              <div className="subText">
                • Exactly 7 characters
                <br />
                • Uppercase A–Z and 0–9 only
                <br />
                • Immutable without a paid respec
              </div>
            </div>

            <button className="primary" onClick={() => setPhase("input")}>
              Assign designation
            </button>
          </>
        )}

        {/* ───── INPUT ───── */}
        {phase === "input" && (
          <>
            <div className="badgeRow">
              <div className="chip">INPUT</div>
              <div className="chip chipPurple">LIVE VALIDATION</div>
            </div>

            <h2 className="titleSm">ENTER DESIGNATION</h2>

            <input
              className={`input ${valid ? "valid" : ""}`}
              value={designation}
              onChange={(e) =>
                setDesignation(e.target.value.toUpperCase().slice(0, 7))
              }
              placeholder="_______"
            />

            <div className="hint">
              {designation.length}/7 •{" "}
              {valid ? "VALID FORMAT" : "INVALID FORMAT"}
            </div>

            {error && <div className="errorBox">{error}</div>}

            <button
              className="primary"
              disabled={!valid}
              onClick={() => setPhase("confirm")}
            >
              Continue
            </button>
          </>
        )}

        {/* ───── CONFIRM ───── */}
        {phase === "confirm" && (
          <>
            <div className="badgeRow">
              <div className="chip">CONFIRMATION</div>
              <div className="chip chipPurple">POINT OF NO RETURN</div>
            </div>

            <h2 className="titleSm">CONFIRM IDENTITY</h2>

            <div className="designationCard">
              {designation}
            </div>

            <p className="body">
              This designation will be bound to your FID.
              <br />
              It cannot be altered without invoking a respec event.
            </p>

            <div className="subPanel">
              <div className="subTitle">SYSTEM NOTE</div>
              <div className="subText">
                After this write, all future episodes will refer to you by this
                identifier.
              </div>
            </div>

            <button className="primary" onClick={() => setPhase("sealing")}>
              Lock designation
            </button>
          </>
        )}

        {/* ───── DONE ───── */}
        {phase === "done" && (
          <>
            <div className="badgeRow">
              <div className="chip">EP2</div>
              <div className="chip chipPurple">IDENTITY SEALED</div>
            </div>

            <h2 className="titleSm">IDENTITY REGISTERED</h2>

            <div className="designationCard">
              {designation}
            </div>

            <p className="body">
              Oversight acknowledges your identifier.
              <br />
              It will appear in future reports without explanation.
            </p>

            {txHash && <div className="hash">tx {txHash.slice(0, 10)}…</div>}

            <button className="primary" onClick={onExit}>
              Continue
            </button>
          </>
        )}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles (MATCH EP1) */
/* ────────────────────────────────────────────── */

const shell: React.CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  position: "relative",
};

const css = `
.bgGlow{
  position:absolute; inset:0;
  background:
    radial-gradient(900px 440px at 50% 8%, rgba(168,85,247,0.38), transparent 62%),
    radial-gradient(720px 360px at 20% 70%, rgba(56,189,248,0.12), transparent 60%);
  pointer-events:none;
}
.vignette{
  position:absolute; inset:0;
  background: radial-gradient(circle at 50% 30%, transparent 55%, rgba(0,0,0,0.55) 100%);
  pointer-events:none;
}
.scanlines{
  position:absolute; inset:0;
  background: linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 100% 3px;
  opacity: .06;
  pointer-events:none;
}
.card{
  position:relative;
  width:100%;
  max-width: 820px;
  border-radius: 30px;
  padding: 26px;
  background: rgba(2,6,23,0.88);
  border: 1px solid rgba(168,85,247,0.46);
  box-shadow:
    0 0 70px rgba(168,85,247,0.42),
    0 80px 220px rgba(0,0,0,0.85),
    inset 0 0 50px rgba(0,0,0,0.55);
  overflow:hidden;
}
.chrome{
  position:absolute; inset:-2px;
  border-radius: 32px;
  background:
    linear-gradient(115deg,
      rgba(168,85,247,0.0) 0%,
      rgba(168,85,247,0.55) 22%,
      rgba(56,189,248,0.18) 50%,
      rgba(168,85,247,0.65) 78%,
      rgba(168,85,247,0.0) 100%);
  filter: blur(18px);
  opacity: .35;
  pointer-events:none;
  animation: shimmer 5.2s linear infinite;
}
@keyframes shimmer{
  0%{transform: translateX(-18%)}
  50%{transform: translateX(18%)}
  100%{transform: translateX(-18%)}
}
.console{
  display:flex;
  justify-content:space-between;
  gap:12px;
  font-size: 11px;
  opacity: .82;
}
.badgeRow{
  margin-top: 10px;
  display:flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip{
  font-size: 11px;
  font-weight: 950;
  letter-spacing: 1.4px;
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.05);
}
.chipPurple{
  border-color: rgba(168,85,247,0.45);
  box-shadow: 0 0 18px rgba(168,85,247,0.35);
}
.chipDim{opacity:.7}
.title{
  font-size: 40px;
  font-weight: 950;
  margin-top: 14px;
}
.titleSm{
  font-size: 26px;
  font-weight: 950;
  margin-top: 10px;
}
.body{
  margin-top: 14px;
  line-height: 1.75;
  opacity: .88;
  max-width: 760px;
}
.body.soft{opacity:.82}
.divider{
  margin-top: 16px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(168,85,247,0.55), transparent);
}
.primary{
  margin-top: 18px;
  width: 100%;
  padding: 14px 18px;
  border-radius: 999px;
  font-weight: 950;
  background: linear-gradient(90deg, rgba(56,189,248,0.96), rgba(168,85,247,0.96));
  color: #020617;
  border:none;
  cursor:pointer;
}
.primary:disabled{opacity:.45}
.input{
  margin-top:18px;
  width:100%;
  padding:16px;
  font-size:20px;
  letter-spacing:6px;
  border-radius:18px;
  background:#020617;
  border:1px solid rgba(255,255,255,.2);
  color:white;
  text-align:center;
}
.input.valid{
  border-color:#38bdf8;
  box-shadow:0 0 24px rgba(56,189,248,.45);
}
.hint{margin-top:6px;font-size:12px;opacity:.7}
.designationCard{
  margin-top:18px;
  padding:24px;
  border-radius:22px;
  font-size:30px;
  letter-spacing:8px;
  text-align:center;
  border:1px solid rgba(168,85,247,.45);
  box-shadow:0 0 40px rgba(168,85,247,.55);
}
.subPanel{
  margin-top:14px;
  border-radius:18px;
  border:1px solid rgba(168,85,247,.28);
  background:rgba(0,0,0,.28);
  padding:12px 14px;
}
.subTitle{font-size:11px;font-weight:950;letter-spacing:1.4px}
.subText{margin-top:6px;font-size:12px;opacity:.8}
.errorBox{
  margin-top:12px;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid rgba(251,113,133,.35);
  background:rgba(251,113,133,.08);
  font-size:12px;
}
.hash{
  margin-top:12px;
  font-size:12px;
  opacity:.7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
.walletOverlay{
  position:fixed; inset:0;
  background:rgba(2,6,23,.92);
  display:flex; align-items:center; justify-content:center;
  z-index:50;
}
.walletCard{
  width:min(520px,100%);
  border-radius:22px;
  border:1px solid rgba(168,85,247,.45);
  background:rgba(0,0,0,.35);
  padding:18px;
  box-shadow:0 0 60px rgba(168,85,247,.35);
}
.walletTitle{font-size:12px;font-weight:950;letter-spacing:1.6px}
.walletBody{margin-top:10px;font-size:13px;opacity:.86}
.walletMeta{margin-top:10px;font-size:11px;opacity:.7}
.pulse{
  margin-top:14px;
  height:6px;
  border-radius:999px;
  background:linear-gradient(90deg,#38bdf8,#a855f7);
  animation:pulse 1.4s infinite;
}
@keyframes pulse{0%{opacity:.4}50%{opacity:1}100%{opacity:.4}}
`;
