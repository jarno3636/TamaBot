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
          : "bg-[var(--bb-neon)]";

        // big neon difference per state
        const stateClasses = !connected
          ? "border-red-400/80 bg-[#2a1115] text-red-100 shadow-[0_0_16px_rgba(248,113,113,0.7)]"
          : !onBase
          ? "border-amber-300/80 bg-[#2a1f10] text-amber-100 shadow-[0_0_16px_rgba(252,211,77,0.7)]"
          : "border-[var(--bb-neon)]/80 bg-[#031c1b] text-[#e8fffb] shadow-[0_0_20px_rgba(121,255,225,0.8)]";

        return (
          <button
            type="button"
            onClick={handleClick}
            className={[
              // no "pill" class so nothing overrides it
              "inline-flex items-center gap-2 rounded-full border text-[11px] font-semibold leading-none",
              "px-4 py-1.5 h-7 transition-colors transition-shadow duration-150",
              stateClasses,
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
