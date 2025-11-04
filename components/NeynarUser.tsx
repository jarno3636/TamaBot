// components/NeynarUser.tsx
"use client";

import dynamic from "next/dynamic";

const enabled =
  (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_ENABLED === "true") ||
  process.env.NEXT_PUBLIC_NEYNAR_ENABLED === "true";

/**
 * Try to load Neynar avatar dropdown, but never throw.
 * Works with both `NeynarUserDropdown` and older `UserDropdown`.
 */
const LazyDropdown = enabled
  ? dynamic(
      async () => {
        try {
          const mod: any = await import("@neynar/react");
          return mod.NeynarUserDropdown ?? mod.UserDropdown ?? (() => null);
        } catch {
          return () => null;
        }
      },
      { ssr: false, loading: () => null }
    )
  : (() => null as any);

export default function NeynarUser(props: Record<string, any>) {
  if (!enabled) return null;
  return <LazyDropdown {...props} />;
}
