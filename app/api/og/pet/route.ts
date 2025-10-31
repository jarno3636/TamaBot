import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { TAMABOT_CORE } from "@/lib/abi";

export const runtime = "edge";

// ---------- Helpers ----------
function ipfsToHttp(u: string) {
  if (!u) return u;
  if (u.startsWith("ipfs://")) return u.replace("ipfs://", "https://ipfs.io/ipfs/");
  return u;
}

async function fetchJson(url: string) {
  const r = await fetch(url, { next: { revalidate: 300 } });
  if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
  return r.json();
}

/** Try to resolve { name, image } for a token id */
async function resolveTokenMedia(client: any, id: bigint) {
  let tokenURI: string | undefined;
  try {
    tokenURI = (await client.readContract({
      address: TAMABOT_CORE.address,
      abi: TAMABOT_CORE.abi,
      functionName: "tokenURI",
      args: [id],
    })) as string;
  } catch (_) {
    // ignore; fall back to defaults below
  }

  // Defaults
  const fallback = { name: `TamaBot #${id}`, image: "/og.png" };

  if (!tokenURI || typeof tokenURI !== "string") return fallback;

  // data:application/json;… (base64 or utf8)
  if (tokenURI.startsWith("data:application/json")) {
    try {
      const [, payload] = tokenURI.split(",", 2);
      const isBase64 = tokenURI.includes(";base64,");
      const jsonStr = isBase64
        ? Buffer.from(payload, "base64").toString("utf8")
        : decodeURIComponent(payload);
      const j = JSON.parse(jsonStr);
      const image = ipfsToHttp(j.image || j.image_url || j.animation_url || fallback.image);
      const name = j.name || fallback.name;
      return { name, image };
    } catch {
      return fallback;
    }
  }

  // http(s) → fetch JSON metadata
  if (/^https?:\/\//i.test(tokenURI) || tokenURI.startsWith("ipfs://")) {
    try {
      const metaUrl = ipfsToHttp(tokenURI);
      const j = await fetchJson(metaUrl);
      const image = ipfsToHttp(j.image || j.image_url || j.animation_url || fallback.image);
      const name = j.name || fallback.name;
      return { name, image };
    } catch {
      return fallback;
    }
  }

  return fallback;
}

/** Optional: read on-chain state for pretty meters */
async function readState(client: any, id: bigint) {
  try {
    const s = (await client.readContract({
      address: TAMABOT_CORE.address,
      abi: TAMABOT_CORE.abi,
      functionName: "getState",
      args: [id],
    })) as any[];
    const [level, xp, mood, hunger, energy, cleanliness] = s || [];
    return {
      level: Number(level ?? 0),
      xp: Number(xp ?? 0),
      mood: Number(mood ?? 0),
      hunger: Number(hunger ?? 0),
      energy: Number(energy ?? 0),
      cleanliness: Number(cleanliness ?? 0),
    };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idParam = searchParams.get("id");
  const titleParam = searchParams.get("title");
  const subtitleParam = searchParams.get("subtitle");

  const rpcUrl =
    process.env.CHAIN_RPC_BASE ||
    process.env.NEXT_PUBLIC_CHAIN_RPC_BASE ||
    "https://mainnet.base.org";

  const client = createPublicClient({ chain: base, transport: http(rpcUrl) });

  // Resolve media + (optional) state
  const id = idParam && /^\d+$/.test(idParam) ? BigInt(idParam) : null;
  const media = id ? await resolveTokenMedia(client, id) : { name: "TamaBots", image: "/og.png" };
  const state = id ? await readState(client, id) : null;

  const title =
    titleParam || (id ? `TamaBot #${id.toString()}` : media.name || "TamaBots");
  const subtitle = subtitleParam || "Farcaster-aware pets on Base";

  // Fonts (optional; robust fallbacks)
  let interBold: ArrayBuffer | undefined;
  let interReg: ArrayBuffer | undefined;
  try {
    interBold = await fetch(
      "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMa1Zf_.woff2"
    ).then((r) => r.arrayBuffer());
    interReg = await fetch(
      "https://fonts.gstatic.com/s/inter/v12/UcC73FwrK3iLTeHuS_fvQtMwCp50KnM8.woff2"
    ).then((r) => r.arrayBuffer());
  } catch {
    // If fonts fail to load, system fonts will be used
  }

  // Premium meters
  const meters = state
    ? [
        { label: "Mood", value: clamp(state.mood) },
        { label: "Hunger", value: clamp(state.hunger) },
        { label: "Energy", value: clamp(state.energy) },
        { label: "Cleanliness", value: clamp(state.cleanliness) },
      ]
    : [];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(1200px 600px at 15% -10%, rgba(31,111,235,0.22), transparent), radial-gradient(1000px 500px at 110% -20%, rgba(245,158,11,0.22), transparent), #0a0b10",
          color: "#fff",
          fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "260px 1fr",
            gap: 32,
            width: 1100,
            padding: 32,
            borderRadius: 24,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            boxShadow: "0 10px 40px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Media card */}
          <div
            style={{
              width: 260,
              height: 260,
              borderRadius: 20,
              overflow: "hidden",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {/* next/og supports remote <img> */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={media.image}
              alt={title}
              width={260}
              height={260}
              style={{ objectFit: "cover", width: "100%", height: "100%" }}
            />
          </div>

          {/* Text + meters */}
          <div style={{ display: "grid", alignContent: "center", gap: 16 }}>
            <div
              style={{
                fontSize: 54,
                fontWeight: 800,
                letterSpacing: -0.5,
                lineHeight: 1.05,
              }}
            >
              {title}
            </div>
            <div style={{ fontSize: 22, opacity: 0.9 }}>{subtitle}</div>

            {/* Badges row */}
            <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
              <Badge color="#3AA6D8">Lives on Farcaster</Badge>
              <Badge color="#EA7A2A">Mint on Base</Badge>
              {state ? <Badge color="#F4C64E">Level {state.level}</Badge> : null}
            </div>

            {/* Premium meters */}
            {meters.length > 0 ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginTop: 8,
                }}
              >
                {meters.map((m) => (
                  <Meter key={m.label} label={m.label} value={m.value} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        interReg ? { name: "Inter", data: interReg, style: "normal", weight: 400 } : undefined,
        interBold ? { name: "Inter", data: interBold, style: "normal", weight: 800 } : undefined,
      ].filter(Boolean) as any,
    }
  );
}

// ---------- Tiny UI helpers for @vercel/og JSX ----------
function Badge({ children, color }: { children: string; color: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 16,
        fontWeight: 600,
        color: "#0b0d12",
        background: color,
        boxShadow: `0 8px 22px ${hexToRgba(color, 0.35)}`,
      }}
    >
      {children}
    </div>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, value));
  const bar = { bg: "rgba(255,255,255,0.14)", fg: "#6CB271" }; // green brand for fill
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ fontSize: 14, opacity: 0.8 }}>{label}</div>
      <div
        style={{
          height: 16,
          width: "100%",
          borderRadius: 999,
          background: bar.bg,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            background: bar.fg,
            boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.15)",
          }}
        />
      </div>
    </div>
  );
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n));
}
function hexToRgba(hex: string, a = 1) {
  const m = hex.replace("#", "");
  const bigint = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r},${g},${b},${a})`;
}
