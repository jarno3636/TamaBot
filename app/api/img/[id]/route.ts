/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from "next/og";

// Run on the Edge so it's fast and cachable
export const runtime = "edge";

// Canvas size (HD)
const SIZE = 1024;
const PADDING = 64;

// Same palette order as the contract: [body, stroke, chassis, eye, accent, bg]
const PALETTE_NAMES = [
  "Azure","Lime","Fuchsia","Sunset","Aqua","Cinder","Coral","Mint","Saffron","Ultraviolet","Teal","Neon"
] as const;

const PALETTES: readonly [string, string, string, string, string, string][] = [
  ["#3AA2FF","#0B57D0","#BBD7FF","#FFFFFF","#0046A6","#0E1220"],
  ["#70E000","#1B5E20","#BFF49A","#0C1B0C","#2C6E49","#0E1520"],
  ["#D23FFF","#6A00A8","#F7C6FF","#140014","#8E2DE2","#1C0F1E"],
  ["#FF8A00","#A63E00","#FFD6A5","#180E00","#FF5600","#1B1207"],
  ["#00E5FF","#006064","#A7F9FF","#001214","#00B8D4","#08161A"],
  ["#B0B3B8","#5F6368","#D7DCE1","#0B0F14","#8AB4F8","#0A0D12"],
  ["#FF6F61","#8A1C13","#FFC2BC","#330A06","#E63946","#1B0E10"],
  ["#73FBD3","#1E6F5C","#BDFBEF","#001A17","#00B295","#0A1A18"],
  ["#F7C948","#6C4C00","#FFE69A","#1D1400","#DAA520","#151104"],
  ["#6B5B95","#2F2445","#C9B7FF","#0F0A14","#9D7EFF","#130E1B"],
  ["#26A69A","#004D40","#A7FFEB","#001B18","#00BFA5","#081917"],
  ["#39FF14","#003300","#B2FFAD","#000F00","#00CC00","#061006"],
];

// Simple SHA-256 → PRNG helpers (Edge has crypto.subtle)
async function hashBytes(input: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}
function u32(bytes: Uint8Array, i: number) {
  // make a repeatable uint32 from 4 consecutive bytes
  const a = bytes[i % bytes.length]!;
  const b = bytes[(i + 1) % bytes.length]!;
  const c = bytes[(i + 2) % bytes.length]!;
  const d = bytes[(i + 3) % bytes.length]!;
  return (a << 24) ^ (b << 16) ^ (c << 8) ^ d;
}
function pick<T>(arr: readonly T[], n: number) {
  return arr[n % arr.length]!;
}
function rint(bytes: Uint8Array, i: number, maxExclusive: number) {
  const v = u32(bytes, i) >>> 0;
  return Number(v % maxExclusive);
}
function rbool(bytes: Uint8Array, i: number) {
  return (u32(bytes, i) & 1) === 1;
}

// Rounded “faceplate” radii similar to the contract
function radii(faceIdx: number): [number, number] {
  if (faceIdx === 0) return [32, 32];
  if (faceIdx === 1) return [18, 18];
  if (faceIdx === 2) return [12, 12];
  return [26, 26];
}

export async function GET(
  _req: Request,
  ctx: { params: { id?: string } }
) {
  const idRaw = (ctx.params?.id || "").replace(/[^0-9]/g, "");
  if (!idRaw) return new Response("Missing id", { status: 400 });

  const seed = await hashBytes(idRaw);

  // Deterministic trait selection (mirrors the spirit of the solidity logic)
  const paletteIdx = rint(seed, 0, PALETTES.length);
  const [body, stroke, chassis, eye, accent, bg] = PALETTES[paletteIdx];

  const eyesIdx    = rint(seed, 1, 5);   // 0..4
  const mouthIdx   = rint(seed, 2, 5);   // 0..4
  const faceIdx    = rint(seed, 3, 4);   // 0..3
  const armIdx     = rint(seed, 4, 3);   // 0..2 (keep it clean)
  const legIdx     = rint(seed, 5, 3);   // 0..2
  const bgIdx      = rint(seed, 6, 6);   // 0..5
  const antenna    = rbool(seed, 7);

  const [rx, ry] = radii(faceIdx);

  // Geometry
  const box = {
    x: PADDING + 120,
    y: PADDING + 120,
    w: SIZE - (PADDING + 120) * 2,
    h: SIZE - (PADDING + 120) * 2,
  };

  // tiny helpers as absolutely-positioned shapes (supported by next/og)
  const Rect = ({
    x, y, w, h, r = 0, fill, strokeColor, strokeWidth = 0, opacity = 1, shadow = "",
  }: {
    x: number; y: number; w: number; h: number; r?: number;
    fill?: string; strokeColor?: string; strokeWidth?: number;
    opacity?: number; shadow?: string;
  }) => (
    <div
      style={{
        position: "absolute",
        left: x, top: y, width: w, height: h,
        background: fill,
        borderRadius: r,
        opacity,
        boxShadow: shadow,
        border: strokeWidth ? `${strokeWidth}px solid ${strokeColor}` : undefined,
      }}
    />
  );

  const Circle = ({ cx, cy, r, fill, o = 1 }: { cx: number; cy: number; r: number; fill: string; o?: number }) => (
    <div
      style={{
        position: "absolute",
        left: cx - r, top: cy - r, width: r * 2, height: r * 2,
        borderRadius: r,
        background: fill,
        opacity: o,
      }}
    />
  );

  // Background variants (grid, rings, stripe, dots, radial)
  const BgLayer = () => {
    if (bgIdx === 1) {
      // faint grid
      const lines: JSX.Element[] = [];
      for (let i = 0; i <= SIZE; i += 64) {
        lines.push(
          <Rect key={`h-${i}`} x={0} y={i} w={SIZE} h={2} fill={stroke + "14"} />,
        );
        lines.push(
          <Rect key={`v-${i}`} x={i} y={0} w={2} h={SIZE} fill={stroke + "14"} />,
        );
      }
      return (
        <>
          <Rect x={0} y={0} w={SIZE} h={SIZE} fill={bg} />
          {lines}
        </>
      );
    }
    if (bgIdx === 2) {
      // rings
      return (
        <>
          <Rect x={0} y={0} w={SIZE} h={SIZE} fill={bg} />
          <Circle cx={SIZE/2} cy={SIZE/2} r={440} fill="transparent" />
          <Circle cx={SIZE/2} cy={SIZE/2} r={370} fill={stroke + "14"} o={0.08} />
          <Circle cx={SIZE/2} cy={SIZE/2} r={300} fill={stroke + "14"} o={0.06} />
          <Circle cx={SIZE/2} cy={SIZE/2} r={230} fill={stroke + "14"} o={0.04} />
        </>
      );
    }
    if (bgIdx === 3) {
      // diagonal band
      return (
        <>
          <Rect x={0} y={0} w={SIZE} h={SIZE} fill={bg} />
          <Rect
            x={-200}
            y={SIZE - 280}
            w={SIZE + 400}
            h={180}
            fill={stroke}
            opacity={0.08}
            r={12}
            shadow={`0 0 50px ${stroke}20`}
          />
        </>
      );
    }
    if (bgIdx === 4) {
      // dots
      const dots: JSX.Element[] = [];
      for (let y = 48; y < SIZE; y += 96) {
        for (let x = 48; x < SIZE; x += 96) {
          dots.push(<Circle key={`${x}-${y}`} cx={x} cy={y} r={3} fill={stroke + "22"} />);
        }
      }
      return (
        <>
          <Rect x={0} y={0} w={SIZE} h={SIZE} fill={bg} />
          {dots}
        </>
      );
    }
    if (bgIdx === 5) {
      // radial glow
      return (
        <>
          <Rect x={0} y={0} w={SIZE} h={SIZE} fill={bg} />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `radial-gradient(40% 40% at 50% 40%, ${bg} 0%, rgba(0,0,0,0) 60%)`,
              opacity: 0.6,
            }}
          />
        </>
      );
    }
    // plain
    return <Rect x={0} y={0} w={SIZE} h={SIZE} fill={bg} />;
  };

  // Eyes
  const Eyes = () => {
    if (eyesIdx === 0) {
      return (
        <>
          <Circle cx={box.x + box.w * 0.28} cy={box.y + box.h * 0.44} r={28} fill={eye} />
          <Circle cx={box.x + box.w * 0.72} cy={box.y + box.h * 0.44} r={28} fill={eye} />
        </>
      );
    }
    if (eyesIdx === 1) {
      return (
        <>
          <Rect x={box.x + box.w * 0.22} y={box.y + box.h * 0.38} w={64} h={64} r={8} fill={eye} />
          <Rect x={box.x + box.w * 0.64} y={box.y + box.h * 0.38} w={64} h={64} r={8} fill={eye} />
        </>
      );
    }
    if (eyesIdx === 2) {
      return (
        <Rect
          x={box.x + box.w * 0.22}
          y={box.y + box.h * 0.40}
          w={box.w * 0.56}
          h={48}
          r={14}
          fill={eye}
        />
      );
    }
    if (eyesIdx === 3) {
      // simple diamonds
      const Diamond = ({ cx }: { cx: number }) => (
        <div
          style={{
            position: "absolute",
            left: cx - 24, top: box.y + box.h * 0.40,
            width: 48, height: 48,
            background: eye,
            transform: "rotate(45deg)",
            borderRadius: 6,
          }}
        />
      );
      return (
        <>
          <Diamond cx={box.x + box.w * 0.30} />
          <Diamond cx={box.x + box.w * 0.70} />
        </>
      );
    }
    // mixed
    return (
      <>
        <Circle cx={box.x + box.w * 0.34} cy={box.y + box.h * 0.44} r={22} fill={eye} />
        <Rect x={box.x + box.w * 0.58} y={box.y + box.h * 0.40} w={48} h={48} r={10} fill={eye} />
      </>
    );
  };

  // Mouth
  const Mouth = () => {
    if (mouthIdx === 0) {
      // grill
      const bars: JSX.Element[] = [];
      for (let i = 0; i < 5; i++) {
        bars.push(
          <Rect
            key={i}
            x={box.x + box.w * 0.40 + i * 20}
            y={box.y + box.h * 0.56}
            w={8}
            h={24}
            fill={accent}
            opacity={0.45}
          />
        );
      }
      return (
        <>
          <Rect
            x={box.x + box.w * 0.38}
            y={box.y + box.h * 0.56}
            w={box.w * 0.24}
            h={28}
            r={8}
            fill={chassis}
          />
          {bars}
        </>
      );
    }
    if (mouthIdx === 1) {
      return (
        <Rect
          x={box.x + box.w * 0.36}
          y={box.y + box.h * 0.58}
          w={box.w * 0.28}
          h={14}
          r={8}
          fill={accent}
        />
      );
    }
    if (mouthIdx === 2) {
      // smile
      return (
        <div
          style={{
            position: "absolute",
            left: box.x + box.w * 0.34,
            top: box.y + box.h * 0.58,
            width: box.w * 0.32,
            height: 48,
            borderBottom: `8px solid ${accent}`,
            borderRadius: "0 0 40px 40px",
          }}
        />
      );
    }
    if (mouthIdx === 3) {
      // line + little vents
      const vents: JSX.Element[] = [];
      for (let i = 0; i < 5; i++) {
        vents.push(
          <Rect
            key={i}
            x={box.x + box.w * 0.36 + i * 24}
            y={box.y + box.h * 0.59}
            w={6}
            h={18}
            fill={accent}
            opacity={0.4}
          />
        );
      }
      return (
        <>
          <Rect
            x={box.x + box.w * 0.34}
            y={box.y + box.h * 0.58}
            w={box.w * 0.32}
            h={4}
            fill={stroke}
            opacity={0.6}
          />
          {vents}
        </>
      );
    }
    // frown
    return (
      <div
        style={{
          position: "absolute",
          left: box.x + box.w * 0.34,
          top: box.y + box.h * 0.60,
          width: box.w * 0.32,
          height: 40,
          borderTop: `6px solid ${accent}`,
          borderRadius: "40px 40px 0 0",
        }}
      />
    );
  };

  // Arms & Legs (clean and minimal)
  const Arms = () => {
    if (armIdx === 0) {
      return (
        <>
          <div
            style={{
              position: "absolute",
              left: box.x - 40, top: box.y + box.h * 0.50,
              width: 120, height: 12, background: stroke, opacity: 0.9,
              borderRadius: 8, filter: "blur(0.2px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: box.x + box.w - 80, top: box.y + box.h * 0.50,
              width: 120, height: 12, background: stroke, opacity: 0.9,
              borderRadius: 8, filter: "blur(0.2px)",
            }}
          />
          <Circle cx={box.x - 42} cy={box.y + box.h * 0.50 + 6} r={12} fill={chassis} />
          <Circle cx={box.x + box.w + 122} cy={box.y + box.h * 0.50 + 6} r={12} fill={chassis} />
        </>
      );
    }
    if (armIdx === 1) {
      return (
        <>
          <Rect x={box.x - 28} y={box.y + box.h * 0.46} w={26} h={60} r={8} fill={chassis} />
          <Rect x={box.x + box.w + 2} y={box.y + box.h * 0.46} w={26} h={60} r={8} fill={chassis} />
        </>
      );
    }
    // magnet-ish
    return (
      <>
        <Rect x={box.x - 16} y={box.y + box.h * 0.48} w={50} h={14} r={7} fill={accent} />
        <Rect x={box.x + box.w - 34} y={box.y + box.h * 0.48} w={50} h={14} r={7} fill={accent} />
      </>
    );
  };

  const Legs = () => {
    if (legIdx === 0) {
      return (
        <>
          <Rect x={box.x + 40} y={box.y + box.h - 24} w={120} h={24} r={12} fill={chassis} />
          <Rect x={box.x + box.w - 160} y={box.y + box.h - 24} w={120} h={24} r={12} fill={chassis} />
        </>
      );
    }
    if (legIdx === 1) {
      return (
        <>
          <Rect x={box.x + box.w * 0.44} y={box.y + box.h - 54} w={16} h={54} fill={chassis} />
          <Rect x={box.x + box.w * 0.56} y={box.y + box.h - 54} w={16} h={54} fill={chassis} />
        </>
      );
    }
    // wheels
    return (
      <>
        <Circle cx={box.x + 120} cy={box.y + box.h + 6} r={22} fill={chassis} />
        <Circle cx={box.x + box.w - 120} cy={box.y + box.h + 6} r={22} fill={chassis} />
      </>
    );
  };

  // Antenna
  const Antenna = () =>
    antenna ? (
      <>
        <Rect
          x={box.x + box.w / 2 - 4}
          y={box.y - 42}
          w={8}
          h={42}
          r={4}
          fill={stroke}
          shadow={`0 0 0 ${stroke}`}
        />
        <Circle cx={box.x + box.w / 2} cy={box.y - 48} r={10} fill={accent} />
        <Circle cx={box.x + box.w / 2} cy={box.y - 48} r={26} fill={accent} o={0.18} />
      </>
    ) : null;

  // The cube itself (cel shade, highlight + side shadow)
  const Cube = () => (
    <>
      {/* side shadow */}
      <Rect
        x={box.x + box.w - 70}
        y={box.y}
        w={70}
        h={box.h}
        r={rx}
        fill={"rgba(0,0,0,0.20)"}
        opacity={0.8}
      />
      {/* body */}
      <Rect
        x={box.x}
        y={box.y}
        w={box.w}
        h={box.h}
        r={rx}
        fill={body}
        strokeColor={stroke}
        strokeWidth={12}
        shadow={`inset 0 0 0 3px ${stroke}44, 0 20px 50px ${stroke}26`}
      />
      {/* top highlight */}
      <Rect
        x={box.x}
        y={box.y}
        w={box.w}
        h={Math.max(56, Math.round(box.h * 0.18))}
        r={20}
        fill={chassis}
        opacity={0.32}
      />
    </>
  );

  // Footer ID label
  const Footer = () => (
    <div
      style={{
        position: "absolute",
        left: PADDING,
        bottom: PADDING,
        fontSize: 28,
        color: accent,
        opacity: 0.75,
        fontFamily: "monospace",
      }}
    >
      #{idRaw} • {PALETTE_NAMES[paletteIdx]}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: SIZE,
          height: SIZE,
          position: "relative",
          background: bg,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Inter, monospace",
        }}
      >
        {/* Background */}
        <BgLayer />

        {/* Legs first (behind cube) */}
        <Legs />

        {/* Main cube */}
        <Cube />

        {/* Arms above cube sides */}
        <Arms />

        {/* Face (eyes + mouth) */}
        <Eyes />
        <Mouth />

        {/* Antenna on top */}
        <Antenna />

        {/* Soft ambient glow */}
        <div
          style={{
            position: "absolute",
            left: box.x - 40,
            top: box.y - 60,
            width: box.w + 80,
            height: box.h + 140,
            background: `radial-gradient(60% 70% at 50% 40%, ${accent}22 0%, transparent 60%)`,
            filter: "blur(2px)",
          }}
        />

        {/* Footer label */}
        <Footer />
      </div>
    ),
    { width: SIZE, height: SIZE }
  );
}
