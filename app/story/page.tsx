// app/story/page.tsx
import type { Metadata } from "next";
import StoryClient from "@/components/story/StoryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Story | Basebots",
  description: "Narrative progression and memory archive",
};

export default function Page() {
  return <StoryClient />;
}
