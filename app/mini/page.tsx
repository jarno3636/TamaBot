// app/mini/page.tsx
"use client";

import AppReady from "@/components/AppReady";
import dynamic from "next/dynamic";

// keep the first paint tiny; client-load heavier UI after the ready ping
const HomeClient = dynamic(() => import("@/components/HomeClient"), { ssr: false });

export default function MiniPage() {
  return (
    <div className="min-h-screen bg-[#0a0b12] text-white">
      {/* Signal Farcaster/Base ASAP */}
      <AppReady />
      <HomeClient />
    </div>
  );
}
