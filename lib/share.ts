export function buildTweetUrl({ text, url }: { text: string; url: string }) {
  const base = "https://twitter.com/intent/tweet";
  const q = new URLSearchParams({ text, url });
  return `${base}?${q.toString()}`;
}

export function farcasterComposeUrl({ text, url }: { text: string; url: string }) {
  const u = new URL("https://warpcast.com/~/compose");
  u.searchParams.set("text", text);
  u.searchParams.set("embeds[]", url); // ensures embed preview
  return u.toString();
}
