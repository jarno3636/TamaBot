// lib/notifications.ts
import type { FrameNotificationDetails } from "./frame-notifications";
import { redis } from "./redis";

const notificationServiceKey = "minikit";

function getUserNotificationDetailsKey(fid: number): string {
  return `${notificationServiceKey}:user:${fid}`;
}

// tiny guard to keep TS happy and avoid bad shapes at runtime
function asFrameDetails(v: unknown): FrameNotificationDetails | null {
  if (
    v &&
    typeof v === "object" &&
    "url" in v &&
    "token" in v &&
    typeof (v as any).url === "string" &&
    typeof (v as any).token === "string"
  ) {
    return v as FrameNotificationDetails;
  }
  return null;
}

export async function getUserNotificationDetails(
  fid: number
): Promise<FrameNotificationDetails | null> {
  if (!redis) return null;

  // ❌ remove the generic; some clients don’t support it
  const raw = await redis.get(getUserNotificationDetailsKey(fid));

  // ✅ narrow at runtime to satisfy TS & correctness
  return asFrameDetails(raw);
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails
): Promise<void> {
  if (!redis) return;
  await redis.set(getUserNotificationDetailsKey(fid), notificationDetails);
}

export async function deleteUserNotificationDetails(fid: number): Promise<void> {
  if (!redis) return;
  await redis.del(getUserNotificationDetailsKey(fid));
}
