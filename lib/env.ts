// lib/env.ts
/**
 * Minimal env helper (no external deps).
 * - Throws server-side if required server vars are missing.
 * - Exposes whitelisted client vars.
 */

const must = (key: string): string => {
  const v = process.env[key];
  if (!v) throw new Error(`[env] Missing required env var: ${key}`);
  return v;
};

// ---- Server-only (throw if missing in prod) ----
export const serverEnv = {
  NEYNAR_API_KEY: process.env.NEYNAR_API_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "",
  REDIS_URL: process.env.REDIS_URL || "",
  REDIS_TOKEN: process.env.REDIS_TOKEN || "",
};

// If you want strict checks in production only:
if (process.env.NODE_ENV === "production") {
  must("NEYNAR_API_KEY");
  must("JWT_SECRET");
  // REDIS_* are optional; only validate if you intend to use notifications.
}

// ---- Client-exposed ----
export const env = {
  // Public URL of your app (e.g. https://tamabot.vercel.app)
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL || "",
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || "development",
  NEXT_PUBLIC_MINIKIT_PROJECT_ID: process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID || "",

  // Domain manifest values (copy from your .well-known/farcaster.json)
  NEXT_PUBLIC_FARCASTER_HEADER: process.env.NEXT_PUBLIC_FARCASTER_HEADER || "",
  NEXT_PUBLIC_FARCASTER_PAYLOAD: process.env.NEXT_PUBLIC_FARCASTER_PAYLOAD || "",
  NEXT_PUBLIC_FARCASTER_SIGNATURE: process.env.NEXT_PUBLIC_FARCASTER_SIGNATURE || "",
};
