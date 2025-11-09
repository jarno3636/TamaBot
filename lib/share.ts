// lib/share.ts
export function buildTweetUrl({ text, url }: { text: string; url: string }) {
  const base = "https://twitter.com/intent/tweet";
  const q = new URLSearchParams();
  if (text) q.set("text", text);
  if (url) q.set("url", url);
  return `${base}?${q.toString()}`;
}

export function farcasterComposeUrl({ text, url }: { text: string; url: string }) {
  const u = new URL("https://warpcast.com/~/compose");
  if (text) u.searchParams.set("text", text);
  if (url) u.searchParams.append("embeds[]", url);
  return u.toString();
}

const TEMPLATES = {
  farcaster: [
    "Summoning a Basebot from the blue tomorrow. #BaseBots with @base.base.eth",
    "Minted my escort through the neon city. #BaseBots // @base.base.eth",
    "One FID, one bot. The skyline just blinked. #BaseBots @base.base.eth",
    "On-chain companion acquired. Meet my Basebot. #BaseBots @base.base.eth",
    "Doors open. Optics online. #BaseBots with @base.base.eth",
    "Into the aurora we go—Basebot online. #BaseBots @base.base.eth",
  ],
  twitter: [
    "Summoning a Basebot from the blue tomorrow. #BaseBots with @base",
    "Minted my escort through the neon city. #BaseBots // @base",
    "One FID, one bot. The skyline just blinked. #BaseBots @base",
    "On-chain companion acquired. Meet my Basebot. #BaseBots @base",
    "Doors open. Optics online. #BaseBots with @base",
    "Into the aurora we go—Basebot online. #BaseBots @base",
  ],
} as const;

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRandomShareText(platform: "farcaster" | "twitter") {
  return pick(TEMPLATES[platform]);
}
