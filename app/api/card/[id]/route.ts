// app/api/card/[id]/route.ts
import { ImageResponse } from "next/og";

export const runtime = "edge";

// Environment: set NEXT_PUBLIC_URL to your public site origin (no trailing slash)
const SITE =
  process.env.NEXT_PUBLIC_URL?.replace(/\/$/, "") ||
  "https://your-domain.example";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const id = (params.id || "").replace(/[^\d]/g, "");
  if (!id) {
    return new Response("Bad id", { status: 400 });
  }

  // Prefer your HD renderer; fallback to on-chain SVG data (if you expose one)
  const hdUrl = `${SITE}/api/img/${id}.png`; // <- you already have this
  const onchainSvgUrl = `${SITE}/api/svg/${id}`; // optional fallback if you add it

  // Try HD first; if it 404s, switch to on-chain
  let botSrc = hdUrl;
  try {
    const probe = await fetch(hdUrl, { method: "HEAD" });
    if (!probe.ok) botSrc = onchainSvgUrl;
  } catch {
    botSrc = onchainSvgUrl;
  }

  // Simple, bold layout — safe web fonts (no custom font load required)
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background:
            "linear-gradient(135deg, #0b0f18 0%, #111a2b 50%, #0b0f18 100%)",
          color: "white",
          padding: "48px",
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        {/* Glow */}
        <div
          style={{
            position: "absolute",
            right: -80,
            top: -80,
            width: 380,
            height: 380,
            borderRadius: 999,
            background: "radial-gradient(circle, rgba(121,255,225,.35), transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        {/* Left: Bot */}
        <div
          style={{
            width: 540,
            height: 540,
            borderRadius: 24,
            padding: 24,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* @vercel/og supports <img src> with absolute URLs */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={botSrc}
            alt={`Basebot #${id}`}
            style={{
              width: 480,
              height: 480,
              objectFit: "contain",
              borderRadius: 16,
            }}
          />
        </div>

        {/* Right: Title + meta */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            paddingLeft: 36,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 999,
              background: "rgba(121,255,225,0.12)",
              border: "1px solid rgba(121,255,225,0.35)",
              fontSize: 20,
              letterSpacing: 2,
              textTransform: "uppercase",
            }}
          >
            BASEBOTS
          </div>

          <div style={{ height: 18 }} />

          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -1,
            }}
          >
            Basebot #{id}
          </div>

          <div style={{ height: 16 }} />

          <div
            style={{
              fontSize: 26,
              opacity: 0.9,
              maxWidth: 520,
            }}
          >
            On-chain cube-bodied bot. Colors & traits from your Farcaster FID.
          </div>

          <div style={{ height: 28 }} />

          <div
            style={{
              display: "inline-flex",
              gap: 12,
              alignItems: "center",
              fontSize: 22,
              opacity: 0.9,
            }}
          >
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              basebots.xyz
            </span>
            <span
              style={{
                padding: "8px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(255,255,255,0.06)",
              }}
            >
              FID: {id}
            </span>
          </div>
        </div>

        {/* Border frame */}
        <div
          style={{
            position: "absolute",
            inset: 24,
            borderRadius: 28,
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
