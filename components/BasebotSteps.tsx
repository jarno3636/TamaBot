"use client";

import Image from "next/image";
import Link from "next/link";

type Step = {
  id: number;
  title: string;
  description: string;
  image: string; // /public path
  cta?: {
    label: string;
    href: string;
    external?: boolean;
  };
};

const STEPS: Step[] = [
  {
    id: 1,
    title: "Mint Your Basebot",
    description:
      "Your Basebot is minted using your Farcaster FID. One transaction, fully on-chain, no metadata servers.",
    image: "/step1.png",
    cta: { label: "Mint Basebot", href: "#mint" },
  },
  {
    id: 2,
    title: "View Your Bot",
    description:
      "Each Basebot is uniquely tied to your FID. Token ID equals your Farcaster identity.",
    image: "/step2.png",
  },
  {
    id: 3,
    title: "Go to Staking",
    description:
      "Basebots can work. Navigate to the NFT staking pool and put your bot to work earning $BOTS.",
    image: "/step3.png",
    cta: { label: "Go to Staking", href: "/staking" },
  },
  {
    id: 4,
    title: "Stake Your Basebot",
    description:
      "Approve once, enter your token ID (FID), and stake. Rewards begin immediately.",
    image: "/step4.png",
  },
  {
    id: 5,
    title: "Earn & Withdraw Anytime",
    description:
      "Earn $BOTS continuously. Claim rewards or unstake at any time — no lockups.",
    image: "/step5.png",
  },
  {
    id: 6,
    title: "Claim, Unstake, Repeat",
    description:
      "Everything stays in your control. Claim rewards when you want and withdraw your Basebot anytime.",
    image: "/step6.png",
  },
];

export default function BasebotSteps() {
  return (
    <section
      className="mt-6"
      style={{
        borderRadius: 24,
        border: "1px solid rgba(255,255,255,0.10)",
        background:
          "radial-gradient(900px 520px at 12% -18%, rgba(121,255,225,0.18), transparent 60%), radial-gradient(900px 520px at 95% -25%, rgba(58,166,216,0.18), transparent 65%), rgba(0,0,0,0.42)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        padding: 18,
        boxShadow:
          "0 20px 60px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                color: "rgba(255,255,255,0.95)",
              }}
            >
              How Basebots Work
            </h2>
            <p
              style={{
                margin: "6px 0 0",
                fontSize: 13,
                lineHeight: 1.45,
                color: "rgba(255,255,255,0.62)",
              }}
            >
              Mint → Stake → Earn — fully on-chain. Clean, fast, and under your control.
            </p>
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.65)",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Chain: Base
            </span>
            <span
              style={{
                fontSize: 11,
                color: "rgba(255,255,255,0.65)",
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              Rewards: $BOTS
            </span>
          </div>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gap: 12,
        }}
      >
        {STEPS.map((step) => (
          <div
            key={step.id}
            style={{
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,0.10)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
              boxShadow:
                "0 10px 30px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)",
              overflow: "hidden",
            }}
          >
            {/* top accent line */}
            <div
              aria-hidden
              style={{
                height: 2,
                background:
                  "linear-gradient(90deg, rgba(121,255,225,0.85), rgba(58,166,216,0.75), rgba(121,255,225,0.20))",
                opacity: 0.9,
              }}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "112px 1fr",
                gap: 14,
                padding: 14,
                alignItems: "stretch",
              }}
            >
              {/* Number + image */}
              <div style={{ display: "grid", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 900,
                      fontSize: 13,
                      color: "rgba(0,0,0,0.90)",
                      background:
                        "linear-gradient(180deg, rgba(121,255,225,1), rgba(58,166,216,0.95))",
                      boxShadow:
                        "0 10px 24px rgba(58,166,216,0.22), 0 10px 24px rgba(121,255,225,0.18)",
                    }}
                  >
                    {step.id}
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.55)",
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    Step
                  </div>
                </div>

                <div
                  style={{
                    position: "relative",
                    width: 112,
                    height: 112,
                    borderRadius: 16,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background:
                      "radial-gradient(120px 120px at 30% 20%, rgba(121,255,225,0.16), transparent 55%), rgba(0,0,0,0.30)",
                    overflow: "hidden",
                  }}
                >
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="112px"
                    style={{
                      objectFit: "cover",
                      filter: "saturate(1.04) contrast(1.03)",
                    }}
                    priority={step.id <= 2}
                  />

                  {/* soft vignette */}
                  <div
                    aria-hidden
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(90px 90px at 50% 35%, transparent 45%, rgba(0,0,0,0.35) 100%)",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              </div>

              {/* Content */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 800,
                      color: "rgba(255,255,255,0.92)",
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      margin: "6px 0 0",
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: "rgba(255,255,255,0.62)",
                    }}
                  >
                    {step.description}
                  </p>
                </div>

                {/* CTA row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                    marginTop: "auto",
                  }}
                >
                  {step.cta ? (
                    <Link
                      href={step.cta.href}
                      target={step.cta.external ? "_blank" : undefined}
                      rel={step.cta.external ? "noopener noreferrer" : undefined}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "9px 14px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 800,
                        color: "rgba(0,0,0,0.90)",
                        textDecoration: "none",
                        background:
                          "linear-gradient(180deg, rgba(121,255,225,1), rgba(58,166,216,0.92))",
                        boxShadow:
                          "0 12px 28px rgba(58,166,216,0.22), 0 10px 24px rgba(121,255,225,0.16)",
                      }}
                    >
                      {step.cta.label}
                      <span
                        aria-hidden
                        style={{
                          display: "inline-block",
                          transform: "translateY(-1px)",
                          opacity: 0.9,
                        }}
                      >
                        ↗
                      </span>
                    </Link>
                  ) : (
                    <span
                      style={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.45)",
                        padding: "8px 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.03)",
                      }}
                    >
                      No action needed — keep going
                    </span>
                  )}

                  <span
                    style={{
                      fontSize: 12,
                      color: "rgba(255,255,255,0.50)",
                      padding: "8px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(0,0,0,0.22)",
                    }}
                  >
                    on-chain • instant
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* End card */}
      <div
        style={{
          marginTop: 14,
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.10)",
          background:
            "radial-gradient(900px 420px at 15% -20%, rgba(58,166,216,0.18), transparent 60%), rgba(255,255,255,0.04)",
          overflow: "hidden",
          boxShadow:
            "0 18px 50px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            padding: 14,
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 12,
          }}
        >
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 190,
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(0,0,0,0.30)",
              overflow: "hidden",
            }}
          >
            <Image
              src="/end.png"
              alt="Basebots — ready"
              fill
              sizes="(max-width: 768px) 92vw, 700px"
              style={{ objectFit: "cover" }}
              priority={false}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.50) 100%)",
                pointerEvents: "none",
              }}
            />
          </div>

          <div style={{ textAlign: "center" }}>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.5,
              }}
            >
              “In the chrome dawn, the city speaks in light. Basebots understand.”
            </p>
            <p
              style={{
                margin: "8px 0 0",
                fontSize: 12,
                color: "rgba(255,255,255,0.48)",
              }}
            >
              You’re ready — mint a bot, stake it, and watch the counters climb.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
