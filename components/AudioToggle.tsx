// components/AudioToggle.tsx
"use client";

import { useEffect, useRef, useState } from "react";

export default function AudioToggle({
  src = "/audio/basebots-loop.mp3",
  startMuted = true,
}: {
  src?: string;
  startMuted?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState<boolean>(startMuted);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0.25;
    a.muted = startMuted;
    audioRef.current = a;

    const onCanPlay = () => setReady(true);
    a.addEventListener("canplaythrough", onCanPlay, { once: true });

    // Autoplay attempts (will be blocked until user gesture on some browsers)
    a.play().catch(() => {
      // will start once user taps the toggle
    });

    return () => {
      a.pause();
      a.src = "";
      a.load();
      audioRef.current = null;
    };
  }, [src, startMuted]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.muted = false;
      a.play().catch(() => {});
      setMuted(false);
    } else {
      a.muted = !a.muted;
      setMuted(a.muted);
      if (!a.muted) a.play().catch(() => {});
    }
  };

  // Inline SVGs (no dependencies)
  const Icon = muted ? IconVolumeOff : IconVolumeOn;

  return (
    <button
      type="button"
      aria-label={muted ? "Unmute background audio" : "Mute background audio"}
      onClick={toggle}
      className="audio-toggle"
      disabled={!ready}
      title={ready ? (muted ? "Unmute" : "Mute") : "Loading…"}
    >
      <Icon />
    </button>
  );
}

function IconVolumeOn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M15 9a4 4 0 010 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17.5 7a7 7 0 010 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function IconVolumeOff() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M11 5L6 9H3v6h3l5 4V5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M16 9l5 5M21 9l-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}
