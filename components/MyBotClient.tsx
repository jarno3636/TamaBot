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
import { detectedFIDString, rememberFID } from "@/lib/fid";

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

type RecentMint = {
  tokenId: string;            // FID == tokenId
  to: `0x${string}`;
  txHash: `0x${string}`;
  blockNumber?: number;
  timestamp?: number;
};

function isValidFID(v: string | number | undefined) {
  if (v === undefined || v === null) return false;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) && n > 0 && Number.isInteger(n);
}
function getErrText(e: unknown): string {
  if (e && typeof e === "object") {
    const anyE = e as any;
    if (typeof anyE.shortMessage === "string" && anyE.shortMessage.length > 0) return anyE.shortMessage;
    if (typeof anyE.message === "string" && anyE.message.length > 0) return anyE.message;
  }
  if (typeof e === "string") return e;
  try { return JSON.stringify(e); } catch { return "Unknown error"; }
}

export default function HomeClient() {
  const { address } = useAccount();

  const { data: price = 0n } = useReadContract({ ...BASEBOTS, functionName: "mintPrice" });
  const { data: maxSupply = 50000n } = useReadContract({ ...BASEBOTS, functionName: "MAX_SUPPLY" });
  const { data: totalMinted = 0n, refetch: refetchMinted } = useReadContract({
    ...BASEBOTS, functionName: "totalMinted",
  });
  const { data: gating = true } = useReadContract({ ...BASEBOTS, functionName: "fidGatingEnabled" });

  const [fidInput, setFidInput] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");

  const { writeContract, data: txHash, error: writeErr } = useWriteContract();
  const { isLoading: pending, isSuccess: mined } = useWaitForTransactionReceipt({
    hash: txHash, chainId: base.id,
  });

  // Recent mints
  const [recent, setRecent] = useState<RecentMint[] | null>(null);
  const [recentErr, setRecentErr] = useState<string>("");
  const [recentAt, setRecentAt] = useState<number | null>(null);

  const priceEth = useMemo(() => formatEther(price), [price]);
  const minted = Number(totalMinted);
  const cap = Number(maxSupply);
  const pct = Math.max(0, Math.min(100, Math.round((minted / Math.max(1, cap)) * 100)));

  // Autofill FID on mount
  useEffect(() => {
    const first = detectedFIDString();
    if (first) setFidInput(first);
  }, []);

  // Remember last-used FID whenever changed to a valid number
  useEffect(() => {
    if (isValidFID(fidInput)) rememberFID(fidInput);
  }, [fidInput]);

  useEffect(() => { if (mined) refetchMinted(); }, [mined, refetchMinted]);

  async function handleMint() {
    try {
      setErr(""); setBusy(true);
      if (!address || !isAddress(address)) { setErr("Connect your wallet first."); return; }
      if (!isValidFID(fidInput)) { setErr("Enter a valid FID (positive integer)."); return; }

      const fidBig = BigInt(fidInput);

      if (gating) {
        const r = await fetch("/api/basebots/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ to: address, fid: Number(fidBig) }),
        });
        const j: SignResp = await r.json();
        if (!j.ok || !j.sig || !j.deadline || !j.price) throw new Error(j.error || "Signing failed");

        await writeContract({
          ...BASEBOTS,
          functionName: "mintWithSig",
          args: [fidBig, BigInt(j.deadline), j.sig],
          value: BigInt(j.price),
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

  // ---- Recent Basebots (hourly refresh) ----
  async function fetchRecent() {
    try {
      setRecentErr("");
      const r = await fetch("/api/basebots/recent?limit=3", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Failed to load recent mints");
      setRecent(j.items as RecentMint[]);
      setRecentAt(Date.now());
    } catch (e) {
      const msg = getErrText(e);
      if (/503|no backend is currently healthy/i.test(msg)) {
        setRecentErr("Network is busy on Base right now. Try again in a minute.");
      } else {
        setRecentErr("Couldn’t load recent activity. Tap refresh.");
      }
    }
  }

  useEffect(() => {
    fetchRecent();
    const id = setInterval(fetchRecent, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(id);
  }, []);

  const siteUrl = process.env.NEXT_PUBLIC_FC_MINIAPP_LINK || process.env.NEXT_PUBLIC_URL || "/";

  return (
    <main className="min-h-[100svh] bg-deep text-white pb-16 page-layer">
      <div className="container pt-6 px-5 stack">
        <AudioToggle src="/audio/basebots-loop.mp3" />

        {/* Hero */}
        <section className="glass hero-logo-card relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(800px 400px at 10% -20%, rgba(58,166,216,0.18), transparent 60%), radial-gradient(900px 500px at 90% -30%, rgba(121,255,225,0.14), transparent 70%)",
              maskImage:
                "radial-gradient(120% 120% at 50% 0%, #000 55%, transparent 100%)",
            }}
          />
          <div className="flex flex-col items-center md:flex-row md:items-center md:gap-8">
            <div className="hero-logo-wrap">
              <Image
                src="/logo.PNG"
                alt="Basebots"
                fill
                sizes="200px"
                priority
                className="rounded-2xl object-contain"
              />
            </div>
            <div className="mt-6 md:mt-0">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Basebots: Couriers from the Blue Tomorrow
              </h1>
              <p className="mt-3 max-w-2xl text-white/90 leading-relaxed">
                In a not-so-distant future, Base is the lifeblood of the open city—
                and the Basebots are its guides. Mint one and a chrome-cheeked companion
                steps through the veil, loyal and curious, stamped with your Farcaster FID.
              </p>

              <ShareRow url={siteUrl} className="mt-4" />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="glass glass-pad bg-[#0f1320]/50 border border-white/10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Minting & Supply</h2>
              <ul className="mt-2 space-y-1 text-white/85">
                <li><span className="text-[#79ffe1] font-semibold">Mint price:</span> {priceEth} Base ETH</li>
                <li><span className="text-[#79ffe1] font-semibold">Max supply:</span> {Number(maxSupply).toLocaleString()}</li>
                <li><span className="text-[#79ffe1] font-semibold">Minted:</span> {Number(totalMinted).toLocaleString()} ({pct}%)</li>
              </ul>
            </div>
            <div className="w-full md:w-1/2">
              <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[#79ffe1]" style={{ width: `${pct}%` }} aria-label={`minted ${pct}%`} />
              </div>
            </div>
          </div>
        </section>

        {/* Mint */}
        <section className="glass glass-pad relative overflow-hidden bg-[#0b0f18]/70">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, #79ffe155 0%, transparent 60%)" }}
          />
          <h2 className="text-xl md:text-2xl font-bold">Bring forth your Basebot</h2>
          <p className="mt-1 text-white/85">
            Enter your Farcaster FID and HQ will sign your passage. One transaction, and your Basebot steps through.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-[220px_auto_160px]">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-white/60">Farcaster FID</span>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                value={fidInput}
                onChange={(e) => setFidInput(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="e.g. 12345"
                className="mt-1 w-full rounded-xl bg-white/10 border border-white/20 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#79ffe1]/60"
              />
            </label>

            <div className="flex items-end gap-3">
              <button
                type="button"
                onClick={handleMint}
                disabled={busy || pending}
                className="btn-pill btn-pill--blue !font-bold"
                style={{ opacity: busy || pending ? 0.7 : 1 }}
              >
                {busy || pending ? "Summoning…" : "Mint Basebot"}
              </button>

              <Link href="/my" className="btn-ghost">See my bot</Link>
            </div>
          </div>

          {(err || writeErr) && (
            <p className="mt-3 text-sm text-red-300">
              {err || getErrText(writeErr)}
            </p>
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

        {/* Recent */}
        <section className="glass glass-pad bg-[#0b0f18]/70">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold">
              Recent Basebots — leading us to the Blue Tomorrow
            </h2>
            <button type="button" onClick={fetchRecent} className="btn-ghost" title="Refresh">
              Refresh
            </button>
          </div>

          {recentErr && <p className="mt-2 text-sm text-red-300">{recentErr}</p>}

          <div className="mt-4 grid gap-3">
            {(recent ?? []).map((m) => (
              <div key={m.txHash} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="pill-note pill-note--blue">FID #{m.tokenId}</span>
                  <span className="text-white/80">to {m.to.slice(0, 6)}…{m.to.slice(-4)}</span>
                </div>
                <Link href={`https://basescan.org/tx/${m.txHash}`} target="_blank" rel="noopener noreferrer" className="btn-ghost">
                  View tx ↗
                </Link>
              </div>
            ))}
            {!recent?.length && !recentErr && (
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-5 text-white/70">
                No recent mints yet.
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-white/60">
            Auto-updates hourly{recentAt ? ` · Last updated ${new Date(recentAt).toLocaleTimeString()}` : ""}.
          </p>
        </section>

        {/* Footer quote */}
        <section className="text-center text-white/70">
          <p className="text-sm">
            “In the chrome dawn, the city speaks in light. Basebots understand.”
          </p>
        </section>

        {/* Bottom links */}
        <section className="flex flex-wrap gap-3 justify-center">
          <Link href="https://basescan.org/" target="_blank" rel="noopener noreferrer" className="pill-note pill-note--blue">
            Chain: Base ↗
          </Link>
          <Link
            href={`https://basescan.org/address/${BASEBOTS.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="pill-note pill-note--blue"
          >
            Contract: {BASEBOTS.address.slice(0,6)}…{BASEBOTS.address.slice(-4)} ↗
          </Link>
        </section>
      </div>
    </main>
  );
}
