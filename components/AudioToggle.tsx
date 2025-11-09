// components/AudioToggle.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

type Props = {
  src: string;
  className?: string; // let parent control position
  loop?: boolean;
  startMuted?: boolean;
  volume?: number; // 0..1
};

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
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      <span className="text-xs font-semibold">{muted ? "Sound off" : "Sound on"}</span>
    </button>
  );
}
