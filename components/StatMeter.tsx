"use client";

export function StatMeter({ label, value, max=100 }: { label: string; value: number; max?: number }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  return (
    <div className="grid gap-1">
      <div className="flex items-center justify-between text-xs text-white/70">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-3 rounded-full bg-white/10 overflow-hidden border border-white/15">
        <div
          className="h-full"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, var(--tam-blue), var(--tam-green))",
            boxShadow: "0 0 16px rgba(58,166,216,.35)"
          }}
        />
      </div>
    </div>
  );
}
