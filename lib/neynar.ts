// lib/neynar.ts
import { serverEnv } from "./env";

export interface NeynarUser {
  fid: string;
  username: string;
  display_name: string;
  pfp_url: string;
  custody_address: string;
  verifications: string[];
}

export async function fetchUser(fid: string): Promise<NeynarUser> {
  const res = await fetch(
    `https://api.neynar.com/v2/farcaster/user/bulk?fids=${encodeURIComponent(fid)}`,
    { headers: { "x-api-key": serverEnv.NEYNAR_API_KEY } }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("Neynar fetch error:", res.status, body);
    throw new Error("Failed to fetch Farcaster user from Neynar");
  }
  const json = await res.json();
  return json?.users?.[0] as NeynarUser;
}
