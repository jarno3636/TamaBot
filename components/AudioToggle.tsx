"use client";

import { useEffect, useRef, useState } from "react";

type Props = { src: string; className?: string; volume?: number };

export default function AudioToggle({ src, className = "", volume = 0.35 }: Props) {
  const [on, setOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(src);
    a.loop = true;
    a.volume = volume;
    audioRef.current = a;

    try {
      if (localStorage.getItem("bb_audio_on") === "1") {
        a.play().then(() => setOn(true)).catch(() => setOn(false));
      }
    } catch {}

    return () => { a.pause(); audioRef.current = null; };
  }, [src, volume]);

  async function toggle() {
    const a = audioRef.current;
    if (!a) return;
    if (on) {
      a.pause(); setOn(false);
      try { localStorage.setItem("bb_audio_on","0"); } catch {}
    } else {
      try { await a.play(); setOn(true); localStorage.setItem("bb_audio_on","1"); } catch {}
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? "Mute background audio" : "Unmute background audio"}
      className={`audio-toggle ${className}`}
    >
      {on ? (
        /* speaker ON */
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/>
          <path fill="currentColor" d="M16.5 8.1a5 5 0 0 1 0 7.8l-1.1-1.1a3.5 3.5 0 0 0 0-5.6l1.1-1.1z"/>
          <path fill="currentColor" d="M18.7 5.9a8 8 0 0 1 0 12.2l-1.1-1.1a6.5 6.5 0 0 0 0-10l1.1-1.1z"/>
        </svg>
      ) : (
        /* speaker MUTED (X) */
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden>
          <path fill="currentColor" d="M4 9v6h4l5 4V5L8 9H4z"/>
          <path fill="currentColor" d="M19 8.5 17.6 7 15 9.6 12.4 7 11 8.4 13.6 11 11 13.6 12.4 15 15 12.4 17.6 15 19 13.6 16.4 11 19 8.5z"/>
        </svg>
      )}
      <span className="sr-only">{on ? "Sound on" : "Sound off"}</span>
    </button>
  );
}
