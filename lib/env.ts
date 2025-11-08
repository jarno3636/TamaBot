// lib/env.ts
/**
 * Lightweight env loader: doesn't throw at build time.
 * Keeps types happy and lets routes fail gracefully if a required
 * secret is actually missing at runtime.
 */

function val(name: string, fallback = ""): string {
  const v = process.env[name];
  return typeof v === "string" ? v : fallback;
}

/** Public (browser) env */
export const env = {
  NEXT_PUBLIC_URL: val("NEXT_PUBLIC_URL"),
  NEXT_PUBLIC_ONCHAINKIT_API_KEY: val("NEXT_PUBLIC_ONCHAINKIT_API_KEY"),
  NEXT_PUBLIC_MINIKIT_PROJECT_ID: val("NEXT_PUBLIC_MINIKIT_PROJECT_ID"),
  NEXT_PUBLIC_BASEBOTS_ADDRESS: val("NEXT_PUBLIC_BASEBOTS_ADDRESS"),
  NEXT_PUBLIC_NEYNAR_CLIENT_ID: val("NEXT_PUBLIC_NEYNAR_CLIENT_ID"),
  // Farcaster Mini App Account Association (optional, for store listing)
  NEXT_PUBLIC_FARCASTER_HEADER: val("NEXT_PUBLIC_FARCASTER_HEADER"),
  NEXT_PUBLIC_FARCASTER_PAYLOAD: val("NEXT_PUBLIC_FARCASTER_PAYLOAD"),
  NEXT_PUBLIC_FARCASTER_SIGNATURE: val("NEXT_PUBLIC_FARCASTER_SIGNATURE"),
} as const;

/** Server-only env (never exposed to client) */
export const serverEnv = {
  // Neynar REST key (required for /api/auth/sign-in and user lookups)
  NEYNAR_API_KEY: val("NEYNAR_API_KEY"),
  // JWT secret for auth cookie
  JWT_SECRET: val("JWT_SECRET"),
  // Off-chain signer that authorizes mintWithSig
  PRIVATE_SIGNER_KEY: val("PRIVATE_SIGNER_KEY"),
  // Optional: Vercel KV/Redis removed per your choice – keep placeholders empty
  REDIS_URL: "",
} as const;

// Tiny dev warnings (optional – won’t break build)
if (process.env.NODE_ENV !== "production") {
  const missing: string[] = [];
  if (!env.NEXT_PUBLIC_URL) missing.push("NEXT_PUBLIC_URL");
  if (!env.NEXT_PUBLIC_BASEBOTS_ADDRESS) missing.push("NEXT_PUBLIC_BASEBOTS_ADDRESS");
  if (!serverEnv.NEYNAR_API_KEY) missing.push("NEYNAR_API_KEY");
  if (!serverEnv.JWT_SECRET) missing.push("JWT_SECRET");
  if (!serverEnv.PRIVATE_SIGNER_KEY) missing.push("PRIVATE_SIGNER_KEY");
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.warn("[env] Missing vars (dev warning):", missing.join(", "));
  }
}
