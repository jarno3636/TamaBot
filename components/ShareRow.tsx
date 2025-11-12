// components/ShareRow.tsx
"use client";

import type { MouseEvent } from "react";
import ShareToFarcaster from "@/components/ShareToFarcaster";
import { getRandomShareText, buildTweetUrl } from "@/lib/share";

type ShareRowProps = {
  /** Absolute page URL for X/Twitter (your OG page). */
  url: string;
  /** Optional absolute image URL (PNG/JPG) to embed on Farcaster. */
  imageUrl?: string;
  className?: string;
  label?: string;
};

export default function ShareRow({ url, imageUrl, className = "", label }: ShareRowProps) {
  // Include your site URL in the Farcaster text so the cast links back to the app.
  const farcasterText = `${getRandomShareText("farcaster")} ${url}`;
  const twitterText = getRandomShareText("twitter");

  const tweetHref = buildTweetUrl({ text: twitterText, url });
  const farcasterEmbed = imageUrl || url;

  const openTweet = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.open(tweetHref, "_top", "noopener,noreferrer");
  };

  return (
    <div className={["flex flex-wrap gap-3", className].join(" ")}>
      {/* Farcaster: casts with image embed (if provided), and text includes your app URL */}
      <ShareToFarcaster text={farcasterText} url={farcasterEmbed} />

      {/* X / Twitter */}
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
