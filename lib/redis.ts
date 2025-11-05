// lib/redis.ts
import { serverEnv } from "./env";

/**
 * Minimal Upstash REST client (no extra deps).
 * - If REDIS_URL or REDIS_TOKEN are missing, exports a null shim.
 */

type FrameNotificationDetails = {
  url: string;
  token: string;
};

const { REDIS_URL, REDIS_TOKEN } = serverEnv;

async function upstashGet<T = unknown>(key: string): Promise<T | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const r = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  const json = await r.json().catch(() => null);
  return (json?.result as T) ?? null;
}

async function upstashSet(key: string, value: unknown): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  }).catch(() => {});
}

async function upstashDel(key: string): Promise<void> {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  await fetch(`${REDIS_URL}/del/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    cache: "no-store",
  }).catch(() => {});
}

export const redis = {
  get: upstashGet<FrameNotificationDetails>,
  set: upstashSet,
  del: upstashDel,
};
