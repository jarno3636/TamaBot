// components/ShareRow.tsx
"use client";

import ShareToFarcaster from "@/components/ShareToFarcaster";
import { getRandomShareText, buildTweetUrl } from "@/lib/share";

export default function ShareRow({
  url,
  className = "",
}: {
  url: string;
  className?: string;
}) {
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
        Share on X
      </a>
    </div>
  );
}
