// components/ShareToFarcaster.tsx
"use client";

type Props = {
  text?: string;
  url?: string;
  className?: string;
};

export default function ShareToFarcaster({ text = "", url, className = "" }: Props) {
  const click = () => {
    const mk: any = (globalThis as any).MiniKit;
    // Prefer MiniKit composer if inside Farcaster
    if (mk?.isMiniApp?.()) {
      mk.composeCast?.({
        text,
        embeds: url ? [url] : undefined,
      });
      return;
    }
    // Fallback to Warpcast web composer
    const site = process.env.NEXT_PUBLIC_FC_MINIAPP_LINK || url || "/";
    const u = new URL("https://warpcast.com/~/compose");
    if (text) u.searchParams.set("text", text);
    if (site) u.searchParams.append("embeds[]", site);
    window.open(u.toString(), "_blank");
  };

  return (
    <button
      onClick={click}
      className={[
        "rounded-xl px-4 py-2 font-semibold",
        "bg-[#8a66ff] hover:bg-[#7b58ef] border border-white/20",
        "shadow-[0_10px_24px_rgba(0,0,0,.35)]",
        className,
      ].join(" ")}
    >
      Share on Farcaster
    </button>
  );
}
