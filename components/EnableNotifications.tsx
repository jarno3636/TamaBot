// components/EnableNotifications.tsx
"use client";
import { sdk } from "@farcaster/miniapp-sdk";
import { useMiniContext } from "@/lib/useMiniContext";

export default function EnableNotifications() {
  const { fid, inMini } = useMiniContext();

  async function openAppSettings() {
    // Deep link to your app settings inside the client; fallback to channel/app page.
    await sdk.actions.openUrl("https://warpcast.com/miniapps"); // or your app's page/settings
  }

  if (!inMini) return null; // only makes sense inside client
  return (
    <button onClick={openAppSettings} className="btn-pill btn-pill--blue">
      Enable notifications
    </button>
  );
}
