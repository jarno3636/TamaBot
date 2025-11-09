"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Path to your looped audio file */
  src: string;
  /** Extra classes (we keep .audio-toggle defaults from your CSS) */
  className?: string;
  /** When true, render icon-only button (no text). */
  iconOnly?: boolean;
};

export default function AudioToggle({ src, className = "", iconOnly = false }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [on, setOn] = useState<boolean>(false);

  // Restore persisted state
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("bb_audio_on") : null;
    setOn(saved === "1");
  }, []);

  // Build audio tag once
  useEffect(() => {
    if (!audioRef.current) {
      const a = new Audio(src);
      a.loop = true;
      a.preload = "auto";
      a.volume = 0.6;
      audioRef.current = a;
    }
  }, [src]);

  // React to on/off
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (on) {
      // Browsers require user gesture; if it fails, flip state back
      a.play().catch(() => setOn(false));
    } else {
      a.pause();
      a.currentTime = 0;
    }
    if (typeof window !== "undefined") localStorage.setItem("bb_audio_on", on ? "1" : "0");
  }, [on]);

  return (
    <button
      type="button"
      className={`audio-toggle ${className}`}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      onClick={() => setOn(v => !v)}
    >
      {/* Speaker icon only; no text so it never bleeds into the PNG */}
      {on ? (
        // Speaker with waves (sound on)
        <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z" />
          <path fill="currentColor" d="M16.5 8.5a4 4 0 010 7" opacity=".9" />
          <path fill="currentColor" d="M18.5 6a7 7 0 010 12" opacity=".7" />
        </svg>
      ) : (
        // Muted speaker icon (sound off)
        <svg width="22" height="22" viewBox="0 0 24 24" role="img" aria-hidden="true">
          <path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z" />
          <path fill="currentColor" d="M20 8l-2 2m0 0l-2 2m2-2l2 2m-2-2l-2-2" />
        </svg>
      )}
    </button>
  );
}
