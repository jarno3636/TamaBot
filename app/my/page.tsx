// app/my/page.tsx
import type { Metadata } from "next";
import MyBotClient from "@/components/MyBotClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "My Basebot",
  description: "View your FID-linked Basebot—fully on-chain SVG.",
};

export default function Page() {
  return <MyBotClient />;
}
