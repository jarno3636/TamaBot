"use client";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";

export default function ConnectPill() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const ready = mounted;
        const connected = ready && !!account;
        const onBase = connected && chain?.id === base.id && !chain?.unsupported;

        return (
          <button
            type="button"
            onClick={() => {
              if (!connected) return openConnectModal();
              if (!onBase) return openChainModal();
              return openAccountModal();
            }}
            className={[
              "pill",
              connected ? "pill-nav" : "pill-opaque",
              "inline-flex items-center gap-1.5 leading-none text-[11px] !px-3 !py-1.5 !h-7 !rounded-full"
            ].join(" ")}
            style={ready ? {} : { opacity: 0, pointerEvents: "none" }}
            title={account?.address || "Connect wallet"}
          >
            <span
              className={`block h-1.5 w-1.5 rounded-full ${
                !connected ? "bg-[var(--danger)]" : onBase ? "bg-[var(--accent)]" : "bg-amber-400"
              }`}
              aria-hidden
            />
            <span className="truncate">
              {!connected ? "Connect" : !onBase ? "Switch" : `${account.address.slice(0,6)}…${account.address.slice(-4)}`}
            </span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
