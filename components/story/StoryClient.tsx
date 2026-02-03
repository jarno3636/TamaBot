"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePublicClient } from "wagmi";
import useFid from "@/hooks/useFid";
import { BASEBOTS_S2 } from "@/lib/abi/basebotsSeason2State";

/* ────────────────────────────────────────────── */
/* Lazy-loaded episodes */
/* ────────────────────────────────────────────── */

const Prologue = dynamic(
  () => import("@/components/story/PrologueSilenceInDarkness"),
  { ssr: false }
);

const EpisodeOne = dynamic(
  () => import("@/components/story/EpisodeOne"),
  { ssr: false }
);

/* later
const EpisodeTwo = dynamic(...)
const EpisodeThree = dynamic(...)
const EpisodeFour = dynamic(...)
const EpisodeFive = dynamic(...)
*/

type Mode =
  | "hub"
  | "prologue"
  | "ep1";

type EpisodeStatus = "locked" | "available" | "complete";

/* ────────────────────────────────────────────── */
/* Component */
/* ────────────────────────────────────────────── */

export default function StoryClient() {
  const { fid } = useFid();
  const publicClient = usePublicClient();

  const [mode, setMode] = useState<Mode>("hub");
  const [botState, setBotState] = useState<{
    ep1Set: boolean;
    ep2Set: boolean;
    ep3Set: boolean;
    ep4Set: boolean;
    ep5Set: boolean;
    finalized: boolean;
  } | null>(null);

  /* ───────── Identity ───────── */

  const hasFid = useMemo(
    () =>
      fid !== undefined &&
      fid !== null &&
      Number.isFinite(Number(fid)) &&
      Number(fid) > 0,
    [fid]
  );

  /* ───────── Hub Ambient Audio ───────── */

  const hubAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (mode !== "hub") {
      hubAudioRef.current?.pause();
      return;
    }

    const audio = new Audio("/audio/hub.mp3");
    audio.loop = true;
    audio.volume = 0.35;
    hubAudioRef.current = audio;
    audio.play().catch(() => {});

    return () => {
      audio.pause();
      audio.currentTime = 0;
      hubAudioRef.current = null;
    };
  }, [mode]);

  /* ───────── Read on-chain progress ───────── */

  useEffect(() => {
    if (!publicClient || !hasFid) return;

    let cancelled = false;

    (async () => {
      try {
        const s: any = await publicClient.readContract({
          address: BASEBOTS_S2.address,
          abi: BASEBOTS_S2.abi,
          functionName: "getBotState",
          args: [BigInt(fid!)],
        });

        if (cancelled) return;

        setBotState({
          ep1Set: s.ep1Set,
          ep2Set: s.ep2Set,
          ep3Set: s.ep3Set,
          ep4Set: s.ep4Set,
          ep5Set: s.ep5Set,
          finalized: s.finalized,
        });
      } catch {
        setBotState(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [publicClient, fid, hasFid]);

  /* ───────── Bonus keys (localStorage only) ───────── */

  const bonusEchoUnlocked =
    typeof window !== "undefined" &&
    localStorage.getItem("basebots_bonus_echo") === "true";

  const bonusArchiveUnlocked =
    typeof window !== "undefined" &&
    localStorage.getItem("basebots_bonus_archive") === "true";

  /* ─────────────────────────────── */
  /* ROUTES */
  /* ─────────────────────────────── */

  if (mode === "prologue") {
    return <Prologue onExit={() => setMode("hub")} />;
  }

  if (mode === "ep1") {
    if (!hasFid) {
      return <MissingIdentity onBack={() => setMode("hub")} />;
    }

    return <EpisodeOne fid={fid!} onExit={() => setMode("hub")} />;
  }

  /* ─────────────────────────────── */
  /* HUB */
  /* ─────────────────────────────── */

  return (
    <main style={page}>
      <div style={container}>
        <header style={header}>
          <h1 style={title}>STORY ARCHIVE</h1>
          <p style={subtitle}>
            Identity: <b>{hasFid ? `FID ${fid}` : "NOT DETECTED"}</b>
          </p>
        </header>

        <section style={grid}>
          <EpisodeCard
            title="PROLOGUE"
            subtitle="Silence in Darkness"
            image="/story/prologue.png"
            status="available"
            badge="ARCHIVE ENTRY"
            onClick={() => setMode("prologue")}
          />

          <EpisodeCard
            title="EPISODE I"
            subtitle="Awakening"
            image="/story/01-awakening.png"
            status={botState?.ep1Set ? "complete" : "available"}
            badge={botState?.ep1Set ? "CORE MEMORY INITIALIZED" : "CORE MEMORY READY"}
            onClick={() => setMode("ep1")}
          />

          <EpisodeCard
            title="EPISODE II"
            subtitle="Designation"
            image="/story/ep2.png"
            status={
              botState?.ep2Set
                ? "complete"
                : botState?.ep1Set
                ? "available"
                : "locked"
            }
            badge={botState?.ep2Set ? "DESIGNATION ASSIGNED" : "LOCKED"}
          />

          <EpisodeCard
            title="EPISODE III"
            subtitle="Cognitive Frame"
            image="/story/ep3.png"
            status={
              botState?.ep3Set
                ? "complete"
                : botState?.ep2Set
                ? "available"
                : "locked"
            }
            badge={botState?.ep3Set ? "BIAS RECORDED" : "LOCKED"}
          />

          <EpisodeCard
            title="EPISODE IV"
            subtitle="Surface Profile"
            image="/story/ep4.png"
            status={
              botState?.ep4Set
                ? "complete"
                : botState?.ep3Set
                ? "available"
                : "locked"
            }
            badge={botState?.ep4Set ? "PROFILE LOCKED" : "LOCKED"}
          />

          <EpisodeCard
            title="EPISODE V"
            subtitle="Outcome"
            image="/story/ep5.png"
            status={
              botState?.finalized
                ? "complete"
                : botState?.ep4Set
                ? "available"
                : "locked"
            }
            badge={botState?.finalized ? "OUTCOME FINALIZED" : "LOCKED"}
          />

          {bonusEchoUnlocked && (
            <EpisodeCard
              title="BONUS ECHO"
              subtitle="Residual Signal"
              image="/story/b1.png"
              status="available"
              badge="ANOMALY DETECTED"
            />
          )}

          {bonusArchiveUnlocked && (
            <EpisodeCard
              title="ARCHIVE ECHO"
              subtitle="Post-Final Memory"
              image="/story/b2.png"
              status="available"
              badge="ARCHIVE UNLOCKED"
            />
          )}
        </section>
      </div>
    </main>
  );
}
