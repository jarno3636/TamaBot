// components/EnableNotifications.tsx
"use client";

import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniContext } from "@/lib/useMiniContext";

export default function EnableNotifications() {
  const { inMini } = useMiniContext();

  async function openAppSettings() {
    const target = "https://warpcast.com/miniapps"; // or your app/channel settings page

    try {
      // Prefer native mini action if present
      if (sdk?.actions?.openUrl) {
        await sdk.actions.openUrl(target);
        return;
      }
      // Some builds expose openURL()
      if ((sdk as any)?.actions?.openURL) {
        await (sdk as any).actions.openURL(target);
        return;
      }
    } catch {
      // ignore and fall through to web
    }

    // Web fallback
    if (typeof window !== "undefined") {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  }

  if (!inMini) return null; // Only useful inside the Farcaster client
  return (
    <button onClick={openAppSettings} className="btn-pill btn-pill--blue">
      Enable notifications
    </button>
  );
}
