"use client";
export default function ShareToFarcaster({ text, url }: { text: string; url?: string }) {
  const click = () => {
    const mk: any = (globalThis as any).MiniKit;
    if (mk?.isMiniApp?.()) {
      // MiniKit will render a composer with prefilled text + optional URL
      mk.composeCast?.({
        text,
        embeds: url ? [url] : undefined
      });
      return;
    }
    // Fallback: open your mini-app or site link in a new tab
    const fallback = url || process.env.NEXT_PUBLIC_FC_MINIAPP_LINK || "/";
    window.open(fallback, "_blank");
  };

  return (
    <button onClick={click} className="rounded-xl px-4 py-2 bg-purple-600 text-white hover:bg-purple-700">
      Share on Farcaster
    </button>
  );
}
