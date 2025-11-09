"use client";

import { useEffect, useMemo, useRef } from "react";

/** Soft neon palette (tweak as you like) */
const DEFAULT_COLORS = ["#79ffe1", "#8aa6ff", "#6dd3ef", "#00c7b7", "#3AA6D8"];

type Cube = {
  x: number; y: number; z: number;   // position + pseudo-depth
  size: number;                       // base size (px at DPR=1)
  rot: number; rotSpeed: number;      // rotation (radians)
  color: string;                      // main face color
  driftX: number; driftY: number;     // gentle drifting
  wobble: number;                     // z wobble factor
};

function makeCube(w: number, h: number, colors: string[]): Cube {
  const size = Math.random() * 22 + 16; // 16..38
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    z: Math.random() * 1, // 0..1 depth
    size,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1) * 0.0012,
    color: colors[(Math.random() * colors.length) | 0],
    driftX: (Math.random() - 0.5) * 0.08,
    driftY: (Math.random() - 0.5) * 0.08,
    wobble: Math.random() * 0.6 + 0.4,
  };
}

export default function BackgroundCubes({
  count = 60,
  colors = DEFAULT_COLORS,
  className = "",
}: {
  count?: number;
  colors?: string[];
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const cubesRef = useRef<Cube[]>([]);
  const rafRef = useRef<number | null>(null);
  const reduceMotion = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );

  // init + resize
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true })!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    function resize() {
      const { innerWidth: w, innerHeight: h } = window;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;

      // Make a fresh field of cubes on resize to keep density consistent
      const N = count;
      const list: Cube[] = [];
      for (let i = 0; i < N; i++) list.push(makeCube(w, h, colors));
      cubesRef.current = list;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(document.body);

    // Pause when hidden (battery-friendly)
    function onVis() {
      if (document.hidden) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      } else {
        loop(performance.now());
      }
    }
    document.addEventListener("visibilitychange", onVis);

    let last = performance.now();

    function drawCube(c: Cube) {
      // pseudo 3D: draw a rotated square + 2 shadow faces
      // scale by depth (smaller when z is large)
      const scale = 0.6 + (1 - c.z) * 0.8; // 0.6..1.4
      const sz = c.size * scale * dpr;

      ctx.save();
      ctx.translate(c.x * dpr, c.y * dpr);

      // glow
      ctx.shadowColor = c.color + "88";
      ctx.shadowBlur = 18 * dpr;

      // base face
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-sz / 2, -sz / 2, sz, sz);

      // side faces (simple shading)
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.45;
      ctx.fillStyle = "#000000";
      // right side
      ctx.transform(1, 0.2, 0, 1, 0, 0); // skew a bit
      ctx.fillRect(0, -sz / 2, sz / 2, sz);
      // bottom side
      ctx.setTransform(1, 0, 0.2, 1, c.x * dpr, c.y * dpr);
      ctx.rotate(c.rot);
      ctx.fillRect(-sz / 2, 0, sz, sz / 2);
      ctx.restore();

      // subtle outline
      ctx.globalAlpha = 0.20;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(c.x * dpr - sz / 2, c.y * dpr - sz / 2, sz, sz);
      ctx.globalAlpha = 1;
    }

    function step(dt: number) {
      const { innerWidth: w, innerHeight: h } = window;
      for (const c of cubesRef.current) {
        c.rot += c.rotSpeed * dt * (reduceMotion ? 0.3 : 1);
        c.x += c.driftX * dt * 0.02 * (reduceMotion ? 0.3 : 1);
        c.y += c.driftY * dt * 0.02 * (reduceMotion ? 0.3 : 1);

        // gentle vertical bob with wobble
        c.y += Math.sin((performance.now() * 0.001 + c.rot) * c.wobble) * 0.05 * (reduceMotion ? 0.3 : 1);

        // wrap around edges for infinite field
        if (c.x < -40) c.x = w + 40;
        if (c.x > w + 40) c.x = -40;
        if (c.y < -40) c.y = h + 40;
        if (c.y > h + 40) c.y = -40;
      }
    }

    function loop(now: number) {
      const dt = Math.min(50, now - last); // clamp stutters
      last = now;

      // clear with a faint vignette
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // draw in depth order (z ascending -> far to near)
      const arr = cubesRef.current.slice().sort((a, b) => a.z - b.z);
      step(dt);
      for (const c of arr) drawCube(c);

      rafRef.current = requestAnimationFrame(loop);
    }
    if (!reduceMotion) loop(last);

    return () => {
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [colors, count, reduceMotion]);

  return (
    <canvas
      ref={ref}
      className={`fixed inset-0 -z-10 pointer-events-none ${className}`}
      aria-hidden
    />
  );
}
