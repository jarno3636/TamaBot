// components/HomeClient.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { formatEther, isAddress } from "viem";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { base } from "viem/chains";
import { BASEBOTS } from "@/lib/abi";
import AudioToggle from "@/components/AudioToggle";
import ShareRow from "@/components/ShareRow";
import useFid from "@/hooks/useFid";
// ❌ removed CollectionPreview
import BasebotTokenCard from "@/components/BasebotTokenCard";
import BasebotSteps from "@/components/BasebotSteps";

type SignResp = {
  ok: boolean;
  verifier?: `0x${string}`;
  to?: `0x${string}`;
  fid?: string;
  price?: string;
  deadline?: string;
  sig?: `0x${string}`;
  error?: string;
};

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}

// 🔧 IMPORTANT: never JSON.stringify the error (BigInt / circular issues)
function getErrText(e: unknown): string {
  if (!e) return "Unknown error";
  if (typeof e === "string") return e;

  if (typeof e === "object") {
    const anyE = e as any;
    if (typeof anyE.shortMessage === "string" && anyE.shortMessage.length > 0) {
      return anyE.shortMessage;
    }
    if (typeof anyE.message === "string" && anyE.message.length > 0) {
      return anyE.message;
    }
    if (
      anyE.cause &&
      typeof anyE.cause.message === "string" &&
      anyE.cause.message.length > 0
    ) {
      return anyE.cause.message;
    }
  }

  try {
    return String(e);
  } catch {
    return "Unknown error";
  }
}

export default function HomeClient() {
  const { address } = useAccount();
  const { fid } = useFid();

  const bigintSupported = typeof BigInt !== "undefined";

  const { data: rawPrice } = useReadContract({
    ...BASEBOTS,
    functionName: "mintPrice",
  });

  const { data: rawMaxSupply } = useReadContract({
    ...BASEBOTS,
    functionName: "MAX_SUPPLY",
  });

  const { data: rawTotalMinted, refetch: refetchMinted } = useReadContract({
    ...BASEBOTS,
    functionName: "totalMinted",
  });

  const { data: gating = true } = useReadContract({
    ...BASEBOTS,
    functionName: "fidGatingEnabled",
  });

  const price = (rawPrice ??
    (bigintSupported ? (BigInt(0) as any) : (0 as any))) as bigint;
  const maxSupply = (rawMaxSupply ??
    (bigintSupported ? (BigInt(50000) as any) : (50000 as any))) as bigint;
  const totalMinted = (rawTotalMinted ??
    (bigintSupported ? (BigInt(0) as any) : (0 as any))) as bigint;

  const [fidInput, setFidInput] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const { writeContract, data: txHash, error: writeErr } = useWriteContract();
  const { isLoading: pending, isSuccess: mined } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: base.id,
  });

  const envBigIntMissing = !bigintSupported;

  const priceEth = useMemo(
    () => (envBigIntMissing ? "0" : formatEther(price)),
    [price, envBigIntMissing],
  );

  const minted = envBigIntMissing ? 0 : Number(totalMinted);
  const cap = envBigIntMissing ? 0 : Number(maxSupply);
  const pct = envBigIntMissing
    ? 0
    : Math.max(0, Math.min(100, Math.round((minted / Math.max(1, cap)) * 100)));

  useEffect(() => {
    if (isValidFID(fid)) setFidInput(String(fid));
  }, [fid]);

  useEffect(() => {
    if (mined) refetchMinted();
  }, [mined, refetchMinted]);

  const fidLocked = !!address && isValidFID(fid);
  const effectiveFid = fidLocked && isValidFID(fid) ? String(fid) : fidInput;

  async function handleMint() {
    try {
      setErr("");
      setBusy(true);

      if (envBigIntMissing) {
        setErr(
          "Your in-app browser is too old for this dapp. Please open Basebots in a modern browser (Chrome, Safari, or Warpcast mini app).",
        );
        return;
      }

      if (!address || !isAddress(address)) {
        setErr("Connect your wallet first.");
        return;
      }
      if (!isValidFID(effectiveFid)) {
        setErr("Enter a valid FID (positive integer).");
        return;
      }

      const fidBig = BigInt(effectiveFid);

      if (gating) {
        const r = await fetch("/api/basebots/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to: address, fid: Number(fidBig) }),
        });
        const j: SignResp = await r.json();
        if (!j.ok || !j.sig || !j.deadline || !j.price) {
          throw new Error(j.error || "Signing failed");
        }

        const deadlineBig = BigInt(j.deadline);
        const priceBig = BigInt(j.price);

        await writeContract({
          ...BASEBOTS,
          functionName: "mintWithSig",
          args: [fidBig, deadlineBig, j.sig],
          value: priceBig,
          chainId: base.id,
        });
      } else {
        await writeContract({
          ...BASEBOTS,
          functionName: "mint",
          args: [fidBig],
          value: price,
          chainId: base.id,
        });
      }
    } catch (e) {
      setErr(getErrText(e));
    } finally {
      setBusy(false);
    }
  }

  const siteUrl =
    (process.env.NEXT_PUBLIC_URL ||
      (typeof window !== "undefined" ? window.location.origin : "") ||
      "https://basebots.vercel.app"
    ).replace(/\/$/, "");

  return (
    <section className="min-h-[100svh] bg-deep text-white pb-16">
      <div className="container pt-6 px-5 stack">
        <AudioToggle src="/audio/basebots-loop.mp3" />

        {/* ✅ HERO */}
        <section className="glass glass-pad relative overflow-hidden rounded-3xl">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(900px 420px at 10% -20%, rgba(58,166,216,0.22), transparent 60%), radial-gradient(1000px 520px at 95% -25%, rgba(121,255,225,0.16), transparent 70%)",
              maskImage:
                "radial-gradient(130% 120% at 50% 0%, #000 55%, transparent 100%)",
            }}
          />

          <div className="relative z-10">
            <div className="flex justify-center">
              <div className="w-full max-w-[620px]">
                <Image
                  src="/logo.PNG"
                  alt="Basebots"
                  width={1200}
                  height={420}
                  priority
                  quality={100}
                  sizes="(max-width: 768px) 92vw, 620px"
                  className="h-auto w-[92%] sm:w-[520px] md:w-[620px] mx-auto select-none"
                  unoptimized
                />
              </div>
            </div>

            <h1 className="mt-5 text-2xl md:text-4xl font-extrabold tracking-tight leading-tight text-center">
              Couriers from the Blue Tomorrow
            </h1>

            <p className="mt-3 text-white/85 leading-relaxed text-center max-w-2xl mx-auto">
              In a not-so-distant future, Base is the lifeblood of the open city—and
              the Basebots are its guides.
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/35 p-3 max-w-xl mx-auto">
              <ShareRow url={siteUrl} className="" />
              <p className="mt-2 text-[11px] text-white/55 text-center">
                Share Basebots with your squad.
              </p>
            </div>

            <div className="mt-3 text-[11px] text-white/55 text-center">
              Neon-blue courier tech • mint-ready • Warpcast friendly
            </div>
          </div>
        </section>

        {/* Token card under hero */}
        <BasebotTokenCard />

        {/* ✅ Tutorial steps replace the old preview */}
        <BasebotSteps />

        {/* Stats */}
        <section className="glass glass-pad bg-[#0f1320]/50 border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Minting & Supply</h2>
              <ul className="mt-2 space-y-1 text-white/85">
                <li>
                  <span className="text-[#79ffe1] font-semibold">Mint price:</span>{" "}
                  {priceEth} Base ETH
                </li>
                <li>
                  <span className="text-[#79ffe1] font-semibold">Max supply:</span>{" "}
                  {envBigIntMissing ? "–" : Number(maxSupply).toLocaleString()}
                </li>
                <li>
                  <span className="text-[#79ffe1] font-semibold">Minted:</span>{" "}
                  {envBigIntMissing
                    ? "–"
                    : `${Number(totalMinted).toLocaleString()} (${pct}%)`}
                </li>
              </ul>
            </div>

            <div className="w-full md:w-1/2">
              <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#79ffe1]"
                  style={{ width: `${pct}%` }}
                  aria-label={`minted ${pct}%`}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Mint (anchor for Step 1 CTA) */}
        <section
          id="mint"
          className="glass glass-pad relative overflow-hidden bg-[#0b0f18]/70 scroll-mt-24"
        >
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
            style={{
              background: "radial-gradient(circle, #79ffe155 0%, transparent 60%)",
            }}
          />
          <h2 className="text-xl md:text-2xl font-bold">Bring forth your Basebot</h2>
          <p className="mt-1 text-white/85">
            Enter your Farcaster FID and HQ will sign your passage. One transaction,
            and your Basebot steps through.
          </p>

          {envBigIntMissing && (
            <p className="mt-3 text-sm text-yellow-300">
              Your in-app browser doesn&apos;t fully support the tech this dapp needs.
              You can still mint from a regular browser (Chrome / Safari) or via the
              Warpcast mini app.
            </p>
          )}

          <div className="mt-5 grid gap-3 md:grid-cols-[220px_auto_160px]">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-white/60 flex items-center gap-2">
                Farcaster FID
                {fidLocked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-[2px] text-[11px] text-emerald-300 border border-emerald-400/40">
                    ✓ Locked to your profile
                  </span>
                )}
              </span>

              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={effectiveFid}
                onChange={(e) =>
                  fidLocked ? null : setFidInput(e.target.value.replace(/[^\d]/g, ""))
                }
                placeholder="e.g. 12345"
                disabled={fidLocked}
                className={`mt-1 w-full rounded-xl border px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 ${
                  fidLocked
                    ? "bg-white/5 border-emerald-400/40 cursor-not-allowed text-white/80"
                    : "bg-white/10 border-white/20 focus:ring-[#79ffe1]/60"
                }`}
              />

              {fidLocked ? (
                <p className="mt-1 text-[11px] text-emerald-300">
                  Your Farcaster FID is loaded from the mini app and can’t be edited here.
                </p>
              ) : (
                <p className="mt-1 text-[11px] text-white/60">
                  Tip: Your FID is the numeric ID in your Farcaster profile.
                </p>
              )}
            </label>

            <div className="flex items-end gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleMint}
                disabled={busy || pending || envBigIntMissing}
                className="btn-pill btn-pill--blue !font-bold"
                style={{ opacity: busy || pending || envBigIntMissing ? 0.7 : 1 }}
              >
                {busy || pending ? "Summoning…" : "Mint Basebot"}
              </button>

              <Link href="/my" className="btn-ghost">
                See my bot
              </Link>
            </div>
          </div>

          {(err || writeErr) && (
            <p className="mt-3 text-sm text-red-300">{err || getErrText(writeErr)}</p>
          )}

          {txHash && !mined && (
            <p className="mt-3 text-sm text-white/80">
              Tx sent:{" "}
              <Link
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-4"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-8)}
              </Link>
            </p>
          )}

          {mined && (
            <p className="mt-3 text-sm text-green-300">
              Arrival confirmed. Your Basebot awaits. ✨
            </p>
          )}
        </section>

        <section className="text-center text-white/70">
          <p className="text-sm">
            “In the chrome dawn, the city speaks in light. Basebots understand.”
          </p>
        </section>

        <section className="flex flex-wrap gap-3 justify-center">
          <Link
            href="https://basescan.org/"
            target="_blank"
            rel="noopener noreferrer"
            className="pill-note pill-note--blue"
          >
            Chain: Base ↗
          </Link>

          <Link
            href={`https://base.blockscout.com/address/${BASEBOTS.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pill-note pill-note--blue"
          >
            Contract: {BASEBOTS.address.slice(0, 6)}…{BASEBOTS.address.slice(-4)} ↗
          </Link>
        </section>
      </div>
    </section>
  );
}
