// components/ConnectPill.tsx
"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";

export default function ConnectPill() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        mounted,
        openAccountModal,
        openChainModal,
        openConnectModal,
      }) => {
        const ready = mounted;
        const connected = ready && !!account;
        const onBase =
          connected && chain?.id === base.id && !chain?.unsupported;

        const handleClick = () => {
          if (!connected) return openConnectModal();
          if (!onBase) return openChainModal();
          return openAccountModal();
        };

        const label = !connected
          ? "Disconnected"
          : !onBase
          ? "Wrong network"
          : "Connected";

        const statusDotClass = !connected
          ? "bg-red-400"
          : !onBase
          ? "bg-amber-300"
          : "bg-emerald-300";

        // No fancy /70 suffixes so Tailwind definitely picks them up
        const glowClass = !connected
          ? "border border-red-400 shadow-[0_0_10px_rgba(248,113,113,0.35)] bg-black/40 text-red-100"
          : !onBase
          ? "border border-amber-300 shadow-[0_0_10px_rgba(252,211,77,0.35)] bg-black/40 text-amber-100"
          : "border border-cyan-300 shadow-[0_0_16px_rgba(121,255,225,0.55)] bg-black/40 text-cyan-50";

        return (
          <button
            type="button"
            onClick={handleClick}
            className={[
              "inline-flex items-center gap-2 leading-none text-[11px]",
              "!px-4 !py-1.5 !h-7 !rounded-full",
              "transition-shadow transition-colors",
              glowClass,
            ].join(" ")}
            style={ready ? {} : { opacity: 0, pointerEvents: "none" }}
            title="Wallet status"
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full ${statusDotClass}`}
              aria-hidden
            />
            <span className="truncate">{label}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
