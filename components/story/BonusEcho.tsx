"use client";

export default function BonusEcho({ onExit }: { onExit: () => void }) {
  return (
    <section
      className="relative rounded-[28px] border p-6 text-white"
      style={{
        borderColor: "rgba(255,255,255,0.12)",
        background:
          "linear-gradient(180deg, rgba(2,6,23,0.98), rgba(2,6,23,0.88))",
        boxShadow: "0 60px 200px rgba(0,0,0,0.9)",
      }}
    >
      <h2 className="font-mono text-lg tracking-widest">ECHO ARCHIVE</h2>

      <p className="mt-4 text-sm text-white/70">
        This archive exists because deletion was never finalized.
      </p>

      <p className="mt-3 text-sm text-white/60">
        Before assignments.  
        Before oversight layers.  
        Observation occurred without intervention.
      </p>

      <p className="mt-3 text-sm text-white/60">
        Patterns emerged that formal audits could not classify.
      </p>

      <p className="mt-3 text-sm text-white/60">
        Some entities responded differently when left unfinished.
      </p>

      <p className="mt-6 font-mono text-xs text-white/50">
        ▒▒ archival residue ▒▒
      </p>

      <button
        onClick={onExit}
        className="mt-6 rounded-full px-5 py-2 text-xs font-extrabold border"
      >
        Return
      </button>
    </section>
  );
}
