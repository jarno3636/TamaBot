// components/NeynarUser.tsx
"use client";

import { useEffect, useState } from "react";

export default function NeynarUser() {
  const [Comp, setComp] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    let alive = true;

    async function boot() {
      // Don’t attempt without provider flag
      if (typeof window === "undefined" || (window as any).__NEYNAR_READY__ !== true) return;

      try {
        const mod: any = await import("@neynar/react");
        const C = mod?.UserButton || mod?.UserDropdown || null; // try both
        if (alive && C) setComp(() => C);
      } catch {
        // swallow—fallback below
      }
    }
    boot();
    return () => { alive = false; };
  }, []);

  if (!Comp) {
    // tiny, inert fallback to keep layout stable
    return <div className="h-14 w-14 rounded-full overflow-hidden border border-white/25 flex items-center justify-center text-2xl">🥚</div>;
  }

  // Most Neynar components take no required props when provider is present
  return <Comp />;
}
