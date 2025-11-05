// lib/notification-client.ts
import type { FrameNotificationDetails, SendNotificationRequest } from "@farcaster/frame-sdk";
import { env } from "./env";
import { getUserNotificationDetails } from "./notifications";

const appUrl = env.NEXT_PUBLIC_URL || "";

export type SendFrameNotificationResult =
  | { state: "success" }
  | { state: "no_token" }
  | { state: "rate_limit" }
  | { state: "error"; error: unknown };

export async function sendFrameNotification({
  fid,
  title,
  body,
  notificationDetails,
}: {
  fid: number;
  title: string;
  body: string;
  notificationDetails?: FrameNotificationDetails | null;
}): Promise<SendFrameNotificationResult> {
  if (!notificationDetails) {
    notificationDetails = await getUserNotificationDetails(fid);
  }
  if (!notificationDetails) {
    return { state: "no_token" };
  }

  const response = await fetch(notificationDetails.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notificationId: crypto.randomUUID(),
      title,
      body,
      targetUrl: appUrl,
      tokens: [notificationDetails.token],
    } satisfies SendNotificationRequest),
  });

  const bodyJson = await response.json().catch(() => ({}));

  if (response.status === 200) {
    const rateLimited = Array.isArray(bodyJson?.result?.rateLimitedTokens) && bodyJson.result.rateLimitedTokens.length > 0;
    if (rateLimited) return { state: "rate_limit" };
    return { state: "success" };
  }

  return { state: "error", error: bodyJson };
}
