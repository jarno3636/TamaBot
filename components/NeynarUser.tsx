// components/NeynarUser.tsx
"use client";

import dynamic from "next/dynamic";

/**
 * Neynar recently names this component `NeynarUserDropdown`.
 * Some older builds exported `UserDropdown`. Grab whichever exists.
 */
const NeynarUserDropdown = dynamic(
  async () => {
    const mod: any = await import("@neynar/react");
    return mod.NeynarUserDropdown ?? mod.UserDropdown;
  },
  { ssr: false }
);

export default function NeynarUser(props: Record<string, any>) {
  // You can pass props like placement/theme per their docs if desired
  return <NeynarUserDropdown {...props} />;
}
