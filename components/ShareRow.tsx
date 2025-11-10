// components/ShareRow.tsx
"use client";

import ShareToFarcaster from "@/components/ShareToFarcaster";
import { getRandomShareText, buildTweetUrl } from "@/lib/share";

type ShareRowProps = {
  url: string;
  className?: string;
  /** Optional label for the X button (default: "Share on X") */
  label?: string;
};

export default function ShareRow({ url, className = "", label }: ShareRowProps) {
  const farcasterText = getRandomShareText("farcaster");
  const twitterText = getRandomShareText("twitter");
  const tweetHref = buildTweetUrl({ text: twitterText, url });

  return (
    <div className={["flex flex-wrap gap-3", className].join(" ")}>
      <ShareToFarcaster text={farcasterText} url={url} />
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
