// components/EnableNotifications.tsx
"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniContext } from "@/lib/useMiniContext";

export default function EnableNotifications() {
  const { inMini } = useMiniContext();

  async function openAppSettings() {
    // Prefer your channel/app URL; env lets you point directly to your space.
    const target =
      process.env.NEXT_PUBLIC_FC_CHANNEL_URL ||
      "https://warpcast.com/~/miniapps"; // ~ path is safer than /miniapps

    try {
      if (sdk?.actions?.openUrl) {
        await sdk.actions.openUrl(target);
        return;
      }
      if ((sdk as any)?.actions?.openURL) {
        await (sdk as any).actions.openURL(target);
        return;
      }
    } catch {
      /* fall through */
    }

    if (typeof window !== "undefined") {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  }

  if (!inMini) return null;
  return (
    <button onClick={openAppSettings} className="btn-pill btn-pill--blue">
      Enable notifications
    </button>
  );
}
