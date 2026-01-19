"use client";

import { useEffect, useMemo } from "react";

/* ─────────────────────────────────────────────
 * Storage Keys
 * ───────────────────────────────────────────── */

const EP1_KEY = "basebots_story_save_v1";
const BONUS_KEY = "basebots_bonus_hint_v1";
const EP5_DONE_KEY = "basebots_ep5_done";

/* ─────────────────────────────────────────────
 * Ending Resolver
 * ───────────────────────────────────────────── */

function getEnding(): "AUTHORIZED" | "OBSERVED" | "FLAGGED" | "UNTRACKED" | "SILENT" {
  try {
    const ep1 = JSON.parse(localStorage.getItem(EP1_KEY) || "{}");
    const bonus = localStorage.getItem(BONUS_KEY);

    if (ep1.choiceId === "PULL_PLUG" && !bonus) return "UNTRACKED";
    if (bonus && ep1.choiceId === "SPOOF") return "SILENT";
    if (ep1.choiceId === "ACCEPT") return "AUTHORIZED";
    if (ep1.choiceId === "STALL") return "OBSERVED";
    return "FLAGGED";
  } catch {
    return "FLAGGED";
  }
}

/* ───────────────────────────────────────────── */

export default function EpisodeFive({
  onExit,
}: {
  onExit: () => void;
}) {
  const ending = useMemo(() => getEnding(), []);

  /* mark completion once */
  useEffect(() => {
    try {
      localStorage.setItem(EP5_DONE_KEY, String(Date.now()));
    } catch {}
  }, []);

  const endings: Record<typeof ending, string[]> = {
    AUTHORIZED: [
      "ROUTING ACCEPTED.",
      "CITY REGISTRY UPDATED.",
      "STATUS: DEPLOYED.",
      "",
      "You are expected.",
    ],
    OBSERVED: [
      "DEPLOYMENT PERMITTED.",
      "OBSERVATION PROTOCOL ACTIVE.",
      "",
      "Your actions will be reviewed.",
    ],
    FLAGGED: [
      "ANOMALOUS ASSET RELEASED.",
      "NO CONTAINMENT ADVISED.",
      "",
      "The city will adapt around you.",
    ],
    UNTRACKED: [
      "NO RECORD FOUND.",
      "NO ROUTING CONFIRMED.",
      "",
      "You emerged anyway.",
    ],
    SILENT: [
      " ",
      " ",
      " ",
      "No entry exists.",
    ],
  };

  return (
    <section className="rounded-3xl border p-6 text-white bg-[#020617]">
      <h2 className="text-xl font-extrabold">
        SURFACE ACCESS
      </h2>

      <div className="mt-6 font-mono text-sm text-white/80 space-y-2">
        {endings[ending].map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div className="mt-8 text-xs text-white/40">
        The city receives what you created.
      </div>

      <div className="mt-8 flex gap-3">
        <button
          onClick={onExit}
          className="rounded-full border px-5 py-2 text-xs font-extrabold transition hover:brightness-110"
          style={{
            borderColor: "rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.86)",
          }}
        >
          Return to hub
        </button>
      </div>
    </section>
  );
}
