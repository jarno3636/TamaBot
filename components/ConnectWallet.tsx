// components/ConnectWallet.tsx
"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
  useChains,
} from "wagmi";
import { base } from "viem/chains";

export default function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const chains = useChains();
  const [open, setOpen] = useState(false);

  const onConnect = async (connectorId?: string) => {
    const c = connectors.find((x) => (connectorId ? x.id === connectorId : true)) || connectors[0];
    if (!c) return;
    await connectAsync({ connector: c });
    // Hard-enforce Base
    if (chainId !== base.id) {
      await switchChainAsync({ chainId: base.id }).catch(() => {});
    }
  };

  const short = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""),
    [address]
  );

  if (isConnected) {
    return (
      <div className="relative">
        <button
          className="btn-pill btn-pill--yellow"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {short} on Base
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl p-2">
            {chainId !== base.id && (
              <button
                className="w-full nav-pill mb-1"
                onClick={() => switchChainAsync({ chainId: base.id })}
              >
                Switch to Base
              </button>
            )}
            <button
              className="w-full btn-ghost"
              onClick={() => {
                disconnect();
                setOpen(false);
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  // Not connected: show options (Injected / WalletConnect / Coinbase)
  return (
    <div className="relative">
      <button
        className="btn-pill btn-pill--blue"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Connect Wallet
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl p-2">
          {connectors.map((c) => (
            <button
              key={c.id}
              onClick={() => onConnect(c.id)}
              disabled={!c.ready || connectStatus === "pending"}
              className="w-full nav-pill mb-1 disabled:opacity-60"
              title={c.name}
            >
              {c.name}
            </button>
          ))}
          <p className="text-xs text-white/60 px-2 py-1">
            You’ll be prompted to connect and (if needed) switch to Base.
          </p>
        </div>
      )}
    </div>
  );
}
