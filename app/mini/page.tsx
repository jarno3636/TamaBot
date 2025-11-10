// app/mini/page.tsx
"use client";

import dynamic from "next/dynamic";
import AppReady from "@/components/AppReady";

const MiniHome = dynamic(() => import("@/components/MiniHome"), { ssr: false });
// ^ create a lightweight Mini-only home (buttons, simple UI); avoid heavy providers here

export default function MiniPage() {
  return (
    <div className="min-h-screen bg-[#0a0b12] text-white">
      {/* Signal readiness on first paint */}
      <AppReady />
      <div className="p-4">
        <MiniHome />
      </div>
    </div>
  );
}
