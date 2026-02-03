// app/story/page.tsx
import type { Metadata } from "next";
import StoryClient from "@/components/story/StoryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Basebots: Core Memory",
  description: "On-chain episodic memory system for Basebots",
};

export default function Page() {
  return <StoryClient />;
}
