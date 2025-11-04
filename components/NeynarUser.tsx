// components/NeynarUser.tsx
"use client";
import dynamic from "next/dynamic";

const UserDropdown = dynamic(
  async () => (await import("@neynar/react")).UserDropdown,
  { ssr: false }
);

export default function NeynarUser() {
  // You can pass props per their docs if desired
  return <UserDropdown />;
}
