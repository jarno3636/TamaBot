// components/ShareRow.tsx
"use client";

import ShareToFarcaster from "@/components/ShareToFarcaster";
import { getRandomShareText, buildTweetUrl } from "@/lib/share";

type ShareRowProps = {
  /** Canonical page URL (used for X/Twitter and as fallback) */
  url: string;
  /** Public HTTPS image URL to embed on Farcaster (e.g., /api/basebots/image/<fid>) */
  imageUrl?: string;
  className?: string;
  /** Optional label for the X button (default: "Share on X") */
  label?: string;
  /** Optional override for Farcaster share text */
  farcasterTextOverride?: string;
  /** Optional override for Twitter share text */
  twitterTextOverride?: string;
};

export default function ShareRow({
  url,
  imageUrl,
  className = "",
  label,
  farcasterTextOverride,
  twitterTextOverride,
}: ShareRowProps) {
  const farcasterText = farcasterTextOverride || getRandomShareText("farcaster");
  const twitterText = twitterTextOverride || getRandomShareText("twitter");

  // X/Twitter should keep linking to your page URL, not the image
  const tweetHref = buildTweetUrl({ text: twitterText, url });

  // For Farcaster, prefer the PNG image URL so the picture shows in the composer
  const farcasterEmbedUrl = imageUrl || url;

  return (
    <div className={["flex flex-wrap gap-3", className].join(" ")}>
      <ShareToFarcaster text={farcasterText} url={farcasterEmbedUrl} />
      <a
        href={tweetHref}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-xl px-4 py-2 font-semibold bg-[#1d9bf0] hover:bg-[#168bd9] border border-white/20 shadow-[0_10px_24px_rgba(0,0,0,.35)]"
      >
        {label || "Share on X"}
      </a>
    </div>
  );
}
