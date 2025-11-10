// app/api/card/[id]/route.tsx
import { ImageResponse } from "next/og";

export const runtime = "edge";

const SITE =
  (process.env.NEXT_PUBLIC_URL?.replace(/\/$/, "")) ||
  "https://your-domain.example";

export async function GET(_req: Request, context: { params: { id: string } }) {
  const id = (context.params.id || "").replace(/[^\d]/g, "");
  if (!id) return new Response("Bad id", { status: 400 });

  const hdUrl = `${SITE}/api/img/${id}.png`;
  const onchainSvgUrl = `${SITE}/api/svg/${id}`; // optional fallback if you add it

  let botSrc = hdUrl;
  try {
    const probe = await fetch(hdUrl, { method: "HEAD", cache: "no-store" });
    if (!probe.ok) botSrc = onchainSvgUrl;
  } catch {
    botSrc = onchainSvgUrl;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          background: "linear-gradient(135deg, #0b0f18 0%, #111a2b 50%, #0b0f18 100%)",
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
            background:
              "radial-gradient(circle, rgba(121,255,225,.35), transparent 60%)",
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
          <img
            src={botSrc}
            alt={`Basebot #${id}`}
            style={{ width: 480, height: 480, objectFit: "contain", borderRadius: 16 }}
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

          <div style={{ fontSize: 26, opacity: 0.9, maxWidth: 520 }}>
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
