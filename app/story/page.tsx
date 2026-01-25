"use client";

import React, { useMemo, useState } from "react";
import { useAccount, useReadContract } from "wagmi";

import useFid from "@/hooks/useFid";

import EpisodeOne from "@/components/story/EpisodeOne";
import EpisodeTwo from "@/components/story/EpisodeTwo";
import EpisodeThree from "@/components/story/EpisodeThree";
import EpisodeFour from "@/components/story/EpisodeFour";
import EpisodeFive from "@/components/story/EpisodeFive";
import PrologueSilenceInDarkness from "@/components/story/PrologueSilenceInDarkness";
import BonusEcho from "@/components/story/BonusEcho";

import { BASEBOTS } from "@/lib/abi";

/* ───────────────────────────────────────────── */

const BASE_CHAIN_ID = 8453;

type Mode =
  | "hub"
  | "prologue"
  | "ep1"
  | "ep2"
  | "ep3"
  | "ep4"
  | "ep5"
  | "bonus";

/* ───────────────────────────────────────────── */

export default function StoryPage() {
  const [mode, setMode] = useState<Mode>("hub");

  const { address, chain } = useAccount();
  const { fid } = useFid();

  /* ───────── token handling (rock solid) ───────── */

  // TokenId is derived from FID, but we NEVER block UI on it
  const tokenIdString = useMemo(() => {
    return typeof fid === "number" && fid > 0 ? String(fid) : undefined;
  }, [fid]);

  const tokenIdBigInt = useMemo(() => {
    try {
      return tokenIdString ? BigInt(tokenIdString) : undefined;
    } catch {
      return undefined;
    }
  }, [tokenIdString]);

  const isBase = chain?.id === BASE_CHAIN_ID;

  /* ───────── NFT ownership (ONLY GATE) ───────── */

  const { data: tokenUri } = useReadContract({
    ...BASEBOTS,
    functionName: "tokenURI",
    args: tokenIdBigInt ? [tokenIdBigInt] : undefined,
    query: {
      enabled: Boolean(address && isBase && tokenIdBigInt),
    },
  });

  const hasBasebot =
    typeof tokenUri === "string" &&
    tokenUri.startsWith("data:application/json;base64,");

  const nftGatePassed = Boolean(address && isBase && hasBasebot);

  /* ───────── ROUTING (NO COMPLEX LOGIC) ───────── */

  if (mode !== "hub") {
    if (!nftGatePassed) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#020617",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
            textAlign: "center",
          }}
        >
          <div>
            <h2 style={{ fontWeight: 900, fontSize: 22 }}>
              Basebot Required
            </h2>
            <p style={{ opacity: 0.7, marginTop: 8 }}>
              Connect a wallet on Base that owns a Basebot NFT.
            </p>
            <button
              onClick={() => setMode("hub")}
              style={{
                marginTop: 18,
                borderRadius: 999,
                padding: "10px 16px",
                fontWeight: 900,
                background: "linear-gradient(90deg,#38bdf8,#a855f7)",
                color: "#020617",
                border: "none",
                cursor: "pointer",
              }}
            >
              Return to Hub
            </button>
          </div>
        </div>
      );
    }

    switch (mode) {
      case "prologue":
        return <PrologueSilenceInDarkness onExit={() => setMode("hub")} />;

      case "ep1":
        return (
          <EpisodeOne
            tokenId={tokenIdString!}
            onExit={() => setMode("hub")}
          />
        );

      case "ep2":
        return (
          <EpisodeTwo
            tokenId={tokenIdString!}
            onExit={() => setMode("hub")}
          />
        );

      case "ep3":
        return (
          <EpisodeThree
            tokenId={tokenIdString!}
            onExit={() => setMode("hub")}
          />
        );

      case "ep4":
        return (
          <EpisodeFour
            tokenId={tokenIdString!}
            onExit={() => setMode("hub")}
          />
        );

      case "ep5":
        return (
          <EpisodeFive
            tokenId={tokenIdString!}
            onExit={() => setMode("hub")}
          />
        );

      case "bonus":
        return <BonusEcho onExit={() => setMode("hub")} />;

      default:
        return null;
    }
  }

  /* ───────── HUB UI ───────── */

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(1100px 520px at 50% -10%, rgba(56,189,248,0.10), transparent 62%), radial-gradient(900px 520px at 90% 120%, rgba(168,85,247,0.12), transparent 60%), #020617",
        color: "white",
        padding: "40px 16px 64px",
      }}
    >
      <header style={{ maxWidth: 1200, margin: "0 auto 28px" }}>
        <div style={{ opacity: 0.6, letterSpacing: 2, fontSize: 11 }}>
          BASEBOTS
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 950 }}>
          Core Memory
        </h1>
        <p style={{ opacity: 0.75, maxWidth: 720, marginTop: 8 }}>
          Your choices are written on-chain. The system remembers what you commit.
        </p>
      </header>

      {/* CORE SEQUENCE */}
      <section style={{ maxWidth: 1200, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {[
            { id: "ep1", title: "Awakening Protocol", img: "/story/01-awakening.png" },
            { id: "ep2", title: "Signal Fracture", img: "/story/ep2.png" },
            { id: "ep3", title: "Fault Lines", img: "/story/ep3.png" },
            { id: "ep4", title: "Threshold", img: "/story/ep4.png" },
            { id: "ep5", title: "Emergence", img: "/story/ep5.png" },
          ].map((ep) => (
            <article
              key={ep.id}
              style={{
                borderRadius: 22,
                background: "rgba(0,0,0,0.35)",
                border: "1px solid rgba(255,255,255,0.14)",
                padding: 20,
                opacity: nftGatePassed ? 1 : 0.5,
              }}
            >
              <img
                src={ep.img}
                alt={ep.title}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  marginBottom: 12,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              />
              <h2 style={{ fontWeight: 900 }}>{ep.title}</h2>

              <button
                disabled={!nftGatePassed}
                onClick={() => setMode(ep.id as Mode)}
                style={{
                  marginTop: 14,
                  width: "100%",
                  borderRadius: 999,
                  padding: "10px 14px",
                  fontWeight: 900,
                  fontSize: 12,
                  background: nftGatePassed
                    ? "linear-gradient(90deg,#38bdf8,#a855f7)"
                    : "rgba(255,255,255,0.08)",
                  color: nftGatePassed ? "#020617" : "rgba(255,255,255,0.6)",
                  border: "none",
                  cursor: nftGatePassed ? "pointer" : "not-allowed",
                }}
              >
                {nftGatePassed ? "Enter Episode" : "NFT Required"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
