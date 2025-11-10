// components/ShareRow.tsx
"use client";

import ShareToFarcaster from "@/components/ShareToFarcaster";
import { getRandomShareText } from "@/lib/share";

type ShareRowProps = {
  /** Absolute page URL for X/Twitter (your OG page). */
  url: string;
  /** Optional absolute image URL (PNG/JPG) to embed on Farcaster. */
  imageUrl?: string;
  className?: string;
  label?: string;
};

// Build a robust X intent URL (x.com avoids some twitter.com redirects)
function buildXUrl({ text, url }: { text: string; url: string }) {
  const u = new URL("https://x.com/intent/tweet");
  if (text) u.searchParams.set("text", text);
  if (url) u.searchParams.set("url", url);
  return u.toString();
}

export default function ShareRow({ url, imageUrl, className = "", label }: ShareRowProps) {
  const farcasterText = getRandomShareText("farcaster");
  const twitterText = getRandomShareText("twitter");

  const tweetHref = buildXUrl({ text: twitterText, url });
  const farcasterEmbed = imageUrl || url;

  const openTweet = (e: React.MouseEvent) => {
    e.preventDefault();
    // Use _top to break out of in-app browsers that trap blank tabs
    window.open(tweetHref, "_top", "noopener,noreferrer");
  };

  return (
    <div className={["flex flex-wrap gap-3", className].join(" ")}>
      {/* Farcaster gets the image (if provided), else the OG page */}
      <ShareToFarcaster text={farcasterText} url={farcasterEmbed} />

      {/* X/Twitter */}
      <a
        href={tweetHref}
        onClick={openTweet}
        className="rounded-xl px-4 py-2 font-semibold bg-[#1d9bf0] hover:bg-[#168bd9] border border-white/20 shadow-[0_10px_24px_rgba(0,0,0,.35)]"
      >
        {label || "Share on X"}
      </a>
    </div>
  );
}
