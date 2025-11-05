// lib/notifications.ts
import type { FrameNotificationDetails } from "@farcaster/frame-sdk";
import { redis } from "./redis";

const KEY_PREFIX = "tamabot:miniapp";

const keyForUser = (fid: number) => `${KEY_PREFIX}:user:${fid}`;

export async function getUserNotificationDetails(
  fid: number
): Promise<FrameNotificationDetails | null> {
  try {
    return (await redis.get(keyForUser(fid))) as FrameNotificationDetails | null;
  } catch {
    return null;
  }
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: FrameNotificationDetails
): Promise<void> {
  try {
    await redis.set(keyForUser(fid), notificationDetails);
  } catch {}
}

export async function deleteUserNotificationDetails(fid: number): Promise<void> {
  try {
    await redis.del(keyForUser(fid));
  } catch {}
}
