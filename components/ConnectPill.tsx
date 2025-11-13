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
          ? "bg-amber-400"
          : "bg-[var(--accent)]";

        const glowClass = !connected
          ? "border border-red-400/70 shadow-[0_0_12px_rgba(248,113,113,0.35)]"
          : !onBase
          ? "border border-amber-300/70 shadow-[0_0_10px_rgba(252,211,77,0.35)]"
          : "border border-[var(--accent)]/70 shadow-[0_0_14px_rgba(121,255,225,0.45)]";

        return (
          <button
            type="button"
            onClick={handleClick}
            className={[
              "pill inline-flex items-center gap-1.5 leading-none text-[11px] !px-3 !py-1.5 !h-7 !rounded-full",
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
