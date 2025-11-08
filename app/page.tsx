// app/page.tsx
import type { Metadata } from "next";
import HomeClient from "@/components/HomeClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Basebots — Mint your on-chain robot",
  description: "Summon a Basebot from the future. Fully on-chain SVG, FID-powered traits.",
};

export default function Page() {
  return <HomeClient />;
}
