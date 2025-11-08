// lib/env.ts
/**
 * Basebots environment loader (no Redis)
 * Handles both server-only and client-exposed variables.
 */

const STRICT = true;

function req(name: string): string {
  const v = process.env[name];
  if (!v || v.length === 0) {
    if (STRICT) throw new Error(`[env] Missing required env var: ${name}`);
    console.warn(`[env] Missing env var: ${name}`);
    return "";
  }
  return v;
}

function opt(name: string, def = ""): string {
  const v = process.env[name];
  return v !== undefined ? v : def;
}

/** Secrets and backend-only values */
export const serverEnv = {
  NEYNAR_API_KEY: req("NEYNAR_API_KEY"),
  JWT_SECRET: req("JWT_SECRET"),

  // Optional private signer for mint/sign API routes
  PRIVATE_SIGNER_KEY: opt("PRIVATE_SIGNER_KEY"),

  // Optional webhook secrets
  FARCASTER_WEBHOOK_SECRET: opt("FARCASTER_WEBHOOK_SECRET"),
};

/** Public (client-exposed) environment values */
export const env = {
  NEXT_PUBLIC_URL: opt("NEXT_PUBLIC_URL", ""),
  NEXT_PUBLIC_ONCHAINKIT_API_KEY: opt("NEXT_PUBLIC_ONCHAINKIT_API_KEY", ""),
  NEXT_PUBLIC_MINIKIT_PROJECT_ID: opt("NEXT_PUBLIC_MINIKIT_PROJECT_ID", ""),
  NEXT_PUBLIC_BASEBOTS_ADDRESS: opt("NEXT_PUBLIC_BASEBOTS_ADDRESS", ""),
  NEXT_PUBLIC_NEYNAR_CLIENT_ID: opt("NEXT_PUBLIC_NEYNAR_CLIENT_ID", ""),
};
