"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function AudioToggle({
  src = "/audio/basebots-loop.mp3",
  initialVolume = 0.35,
}: { src?: string; initialVolume?: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [enabled, setEnabled] = useState(false); // has user allowed audio?
  const [muted, setMuted] = useState(true);

  // Create / attach the audio element once
  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.volume = initialVolume;
    a.muted = true;               // start muted to satisfy autoplay rules
    a.preload = "auto";
    audioRef.current = a;

    // try silent autoplay; some browsers allow it
    a.play().catch(() => {/* ignored until user interacts */});

    return () => { a.pause(); a.src = ""; };
  }, [src, initialVolume]);

  function toggle() {
    const a = audioRef.current;
    if (!a) return;

    // First user click: enable and unmute
    if (!enabled) {
      setEnabled(true);
      a.muted = false;
      setMuted(false);
      a.play().catch(() => {/* if it still fails, keep button state */});
      return;
    }

    // Subsequent clicks: just mute/unmute
    const nextMuted = !muted;
    setMuted(nextMuted);
    a.muted = nextMuted;
    if (!nextMuted) a.play().catch(() => {/* no-op */});
  }

  return (
    <button
      type="button"
      aria-label={muted ? "Unmute ambience" : "Mute ambience"}
      onClick={toggle}
      className="audio-toggle-top"
      title={muted ? "Sound off" : "Sound on"}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}
