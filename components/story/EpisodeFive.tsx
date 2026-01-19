"use client";

import { useMemo } from "react";

const EP1_KEY = "basebots_story_save_v1";
const EP2_KEY = "basebots_ep2_designation_v1";
const BONUS_KEY = "basebots_bonus_hint_v1";

function getEnding() {
  const ep1 = JSON.parse(localStorage.getItem(EP1_KEY) || "{}");
  const bonus = localStorage.getItem(BONUS_KEY);

  if (ep1.choiceId === "PULL_PLUG" && !bonus) return "UNTRACKED";
  if (bonus && ep1.choiceId === "SPOOF") return "SILENT";
  if (ep1.choiceId === "ACCEPT") return "AUTHORIZED";
  if (ep1.choiceId === "STALL") return "OBSERVED";
  return "FLAGGED";
}

export default function EpisodeFive() {
  const ending = useMemo(() => getEnding(), []);

  const endings: Record<string, string[]> = {
    AUTHORIZED: [
      "ROUTING ACCEPTED.",
      "STATUS: DEPLOYED.",
    ],
    OBSERVED: [
      "OBSERVATION ONGOING.",
    ],
    FLAGGED: [
      "ANOMALOUS ASSET DEPLOYED.",
    ],
    UNTRACKED: [
      "NO RECORD FOUND.",
    ],
    SILENT: [
      " ",
    ],
  };

  return (
    <section className="rounded-3xl border p-6 text-white bg-[#020617]">
      <h2 className="text-xl font-extrabold">SURFACE ACCESS</h2>

      <div className="mt-6 font-mono text-sm text-white/80 space-y-2">
        {endings[ending].map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>

      <div className="mt-8 text-xs text-white/40">
        The city receives what you created.
      </div>
    </section>
  );
}
