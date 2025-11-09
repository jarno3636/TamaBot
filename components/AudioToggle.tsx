// components/AudioToggle.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  src: string;
  className?: string; // parent controls position
  loop?: boolean;
  startMuted?: boolean;
  volume?: number; // 0..1
};

function IconVolumeOn(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z"></path>
      <path fill="currentColor" d="M16.5 8.5a4.5 4.5 0 010 6.36l-1.06-1.06a3 3 0 000-4.24L16.5 8.5z"></path>
      <path fill="currentColor" d="M19 6a8 8 0 010 12l-1.06-1.06a6.5 6.5 0 000-9.19L19 6z"></path>
    </svg>
  );
}

function IconVolumeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden {...props}>
      <path fill="currentColor" d="M3 9v6h4l5 4V5L7 9H3z"></path>
      <path fill="currentColor" d="M16 9l5 5-1.41 1.41L14.59 10.4 12.17 8 13.6 6.59 16 9z"></path>
      <path fill="currentColor" d="M21 9l-5 5-1.41-1.41L19.6 7.6 21 9z"></path>
    </svg>
  );
}

export default function AudioToggle({
  src,
  className = "",
  loop = true,
  startMuted = true,
  volume = 0.35,
}: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(startMuted);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const a = new Audio(src);
    a.loop = loop;
    a.preload = "auto";
    a.muted = startMuted;
    a.volume = Math.max(0, Math.min(1, volume));
    audioRef.current = a;

    const onCanPlay = () => setReady(true);
    a.addEventListener("canplay", onCanPlay);

    return () => {
      a.pause();
      a.removeEventListener("canplay", onCanPlay);
      audioRef.current = null;
    };
  }, [src, loop, startMuted, volume]);

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    const next = !muted;
    setMuted(next);
    a.muted = next;
    if (!next) {
      try { await a.play(); } catch {}
    } else {
      a.pause();
    }
  }

  return (
    <button
      type="button"
      aria-label={muted ? "Unmute ambiance" : "Mute ambiance"}
      onClick={toggle}
      disabled={!ready}
      className={[
        "rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-3 py-2",
        "shadow-[0_8px_24px_rgba(0,0,0,.35)] hover:bg-white/14 transition",
        "flex items-center gap-2",
        className,
      ].join(" ")}
    >
      {muted ? <IconVolumeOff /> : <IconVolumeOn />}
      <span className="text-xs font-semibold">{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
