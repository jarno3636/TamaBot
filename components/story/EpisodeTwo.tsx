"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWriteContract,
} from "wagmi";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";
import {
  bytesToString,
  hexToBytes,
  isHex,
  pad,
  stringToHex,
  type Hex,
} from "viem";

/* ────────────────────────────────────────────── */
/* Constants */
/* ────────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const SOUND_KEY = "basebots_ep2_sound";
const BASE_CHAIN_ID = 8453;

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

/** FID-safe normalization (digits only) */
function normalizeTokenId(
  input: string | number | bigint | undefined | null
): bigint | null {
  try {
    if (input === undefined || input === null) return null;
    if (typeof input === "bigint") return input;

    const digits = String(input).match(/\d+/)?.[0];
    if (!digits) return null;

    return BigInt(digits);
  } catch {
    return null;
  }
}

function validateDesignation(v: string) {
  if (!/^[A-Z0-9]+$/.test(v)) return "ONLY A–Z AND 0–9 ALLOWED";
  if (v.length !== 7) return "DESIGNATION MUST BE EXACTLY 7 CHARACTERS";
  return null;
}

/** bytes7 encoder */
function encodeDesignationBytes7(desig: string): Hex {
  return pad(stringToHex(desig), { size: 7 });
}

/** bytes7 → string */
function decodeBytes7ToString(v: unknown): string {
  try {
    if (typeof v === "string" && isHex(v)) {
      const bytes = hexToBytes(v);
      return bytesToString(bytes).replace(/\u0000/g, "").trim();
    }
    return "";
  } catch {
    return "";
  }
}

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function EpisodeTwo({
  tokenId,
  onExit,
}: {
  tokenId?: string | number | bigint;
  onExit: () => void;
}) {
  const tokenIdBig = useMemo(() => normalizeTokenId(tokenId), [tokenId]);
  const ep1 = useMemo(() => loadEp1(), []);

  const [phase, setPhase] = useState<Phase>("descent");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [alreadySet, setAlreadySet] = useState(false);
  const [existingDesignation, setExistingDesignation] = useState("");
  const [chainStatus, setChainStatus] = useState("Idle");
  const [submitting, setSubmitting] = useState(false);

  /* wagmi */
  const { address, chain, connector, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const isBase = chain?.id === BASE_CHAIN_ID;
  const readyToRead = Boolean(publicClient && tokenIdBig !== null);
  const readyToWrite = Boolean(address && publicClient && tokenIdBig !== null);

  /* ────────────────────────────────────────────── */
  /* Audio */
  /* ────────────────────────────────────────────── */

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [soundOn, setSoundOn] = useState(true);

  useEffect(() => {
    if (localStorage.getItem(SOUND_KEY) === "off") setSoundOn(false);
  }, []);

  useEffect(() => {
    const a = new Audio("/audio/s2.mp3");
    a.loop = true;
    a.volume = 0.6;
    audioRef.current = a;
    if (soundOn) a.play().catch(() => {});
    return () => {
      a.pause();
      a.src = "";
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (soundOn) {
      a.play().catch(() => {});
      localStorage.setItem(SOUND_KEY, "on");
    } else {
      a.pause();
      localStorage.setItem(SOUND_KEY, "off");
    }
  }, [soundOn]);

  /* ────────────────────────────────────────────── */
  /* Read state */
  /* ────────────────────────────────────────────── */

  useEffect(() => {
    if (!readyToRead) return;

    let cancelled = false;

    (async () => {
      try {
        setChainStatus("Reading designation state…");

        const state: any = await publicClient!.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [tokenIdBig!],
        });

        const desig = decodeBytes7ToString(state?.[0]);
        const ep2Set = Boolean(state?.[9]);

        if (cancelled) return;

        setExistingDesignation(desig);

        if (ep2Set) {
          setAlreadySet(true);
          setPhase("approach");
          setChainStatus(`Designation bound: ${desig || "—"}`);
        } else {
          setChainStatus("Awaiting designation");
        }
      } catch {
        if (!cancelled) setChainStatus("Chain read failed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [readyToRead, publicClient, tokenIdBig]);

  /* ────────────────────────────────────────────── */
  /* Commit */
  /* ────────────────────────────────────────────── */

  async function commit() {
    if (submitting || alreadySet) return;

    setError(null);

    if (!tokenIdBig) {
      setError("TOKEN ID NOT READY");
      return;
    }

    const cleaned = value.trim().toUpperCase();
    const err = validateDesignation(cleaned);
    if (err) {
      setError(err);
      return;
    }

    if (!readyToWrite) {
      setError("CONNECT WALLET TO CONTINUE");
      return;
    }

    const designationBytes7 = encodeDesignationBytes7(cleaned);

    try {
      setSubmitting(true);

      if (!isBase) {
        setChainStatus("Switching to Base…");
        await switchChainAsync({ chainId: BASE_CHAIN_ID });
      }

      setChainStatus("Preparing transaction…");

      const { request } = await publicClient!.simulateContract({
        address: BASEBOTS_S2.address,
        abi: BASEBOTS_S2.abi,
        functionName: "setEpisode2Designation",
        args: [tokenIdBig, designationBytes7],
        account: address!,
      });

      const hash = await writeContractAsync(request as any);

      setChainStatus("Finalizing…");
      await publicClient!.waitForTransactionReceipt({ hash });

      setExistingDesignation(cleaned);
      setPhase("binding");
      setTimeout(() => setPhase("approach"), 1400);
      setChainStatus(`Designation committed: ${cleaned}`);
    } catch (e: any) {
      setError(e?.shortMessage || "TRANSACTION FAILED");
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
      {/* DEBUG CONSOLE */}
      <div style={consoleRow}>
        <span>
          status: <b>{chainStatus}</b> • chain: <b>{chain?.id ?? "—"}</b> •
          addr: <b>{address ? "yes" : "no"}</b> • tokenId raw:{" "}
          <b>{String(tokenId ?? "—")}</b> → parsed:{" "}
          <b>{tokenIdBig?.toString() ?? "waiting"}</b>
        </span>

        <button onClick={() => setSoundOn((s) => !s)} style={soundBtn}>
          {soundOn ? "SOUND ON" : "SOUND OFF"}
        </button>
      </div>

      {phase === "input" && (
        <>
          <h2 style={title}>ASSIGN DESIGNATION</h2>

          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            maxLength={7}
            style={inputStyle}
            placeholder="XXXXXXX"
          />

          {error && <div style={errorStyle}>{error}</div>}

          <button style={primaryBtn} onClick={commit}>
            CONFIRM DESIGNATION
          </button>
        </>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────── */
/* Styles */
/* ────────────────────────────────────────────── */

const shell: CSSProperties = {
  borderRadius: 28,
  padding: 24,
  color: "white",
  background: "linear-gradient(180deg, #020617, #020617cc)",
};

const consoleRow: CSSProperties = {
  fontSize: 11,
  opacity: 0.75,
  marginBottom: 12,
};

const soundBtn: CSSProperties = {
  marginLeft: 12,
  padding: "6px 10px",
};

const title: CSSProperties = { fontSize: 22, fontWeight: 900 };
const inputStyle: CSSProperties = { width: "100%", padding: 12 };
const primaryBtn: CSSProperties = { marginTop: 12, padding: 12 };
const errorStyle: CSSProperties = { color: "#fca5a5", marginTop: 8 };
