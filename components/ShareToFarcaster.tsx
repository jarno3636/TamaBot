// components/ShareToFarcaster.tsx
"use client";

type Props = {
  text?: string;
  url?: string;        // page you want to embed
  className?: string;
};

function toAbs(u?: string): string {
  if (!u) return "";
  try {
    // If already absolute, keep it
    if (/^https?:\/\//i.test(u)) return u;
    // Else build from current origin
    const base =
      (typeof window !== "undefined" && window.location?.origin) ||
      (process.env.NEXT_PUBLIC_URL || "").replace(/\/$/, "") ||
      "https://basebots.vercel.app";
    return new URL(u, base).toString();
  } catch {
    return "";
  }
}

export default function ShareToFarcaster({ text = "", url, className = "" }: Props) {
  const click = async () => {
    const embed = toAbs(
      // Prefer your configured miniapp link (good for in-app sharing)
      process.env.NEXT_PUBLIC_FC_MINIAPP_LINK || url || "/"
    );

    // 1) Base App MiniKit (Coinbase / Base wallet app)
    try {
      const w = globalThis as any;
      const mk = w?.miniKit || w?.coinbase?.miniKit || w?.MiniKit || null;
      if (mk?.composeCast) {
        await Promise.resolve(mk.composeCast({ text, embeds: embed ? [embed] : [] }));
        return;
      }
    } catch {
      /* ignore */
    }

    // 2) Farcaster Mini App SDK (Warpcast)
    try {
      const mod: any = await import("@farcaster/miniapp-sdk").catch(() => null);
      const sdk: any = mod?.sdk ?? mod?.default ?? null;

      if (sdk?.actions?.composeCast) {
        // nudge host first so composer opens reliably
        try {
          await Promise.race([
            Promise.resolve(sdk.actions.ready?.()),
            new Promise((r) => setTimeout(r, 600)),
          ]);
        } catch {}
        await Promise.resolve(
          sdk.actions.composeCast({ text, embeds: embed ? [embed] : [] })
        );
        return;
      }

      // Some older shims only expose openUrl/openURL—fall back to web composer
      if (sdk?.actions?.openUrl || sdk?.actions?.openURL) {
        const u = new URL("https://warpcast.com/~/compose");
        if (text) u.searchParams.set("text", text);
        if (embed) u.searchParams.append("embeds[]", embed);
        try {
          await Promise.resolve(sdk.actions.openUrl?.(u.toString()));
        } catch {
          await Promise.resolve(sdk.actions.openURL?.(u.toString()));
        }
        return;
      }
    } catch {
      /* ignore */
    }

    // 3) Final fallback: open web composer
    const u = new URL("https://warpcast.com/~/compose");
    if (text) u.searchParams.set("text", text);
    if (embed) u.searchParams.append("embeds[]", embed);
    // Use _top so in-app browsers don’t trap a blank tab
    window.open(u.toString(), "_top", "noopener,noreferrer");
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
