"use client";

import { useMemo, useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { base } from "viem/chains";

export default function ConnectWallet() {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connectAsync, status: connectStatus } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync } = useSwitchChain();
  const [open, setOpen] = useState(false);

  async function onConnect(connectorId?: string) {
    const c = connectors.find((x) => (connectorId ? x.id === connectorId : true)) || connectors[0];
    if (!c) return;

    // Request connection targeting Base directly (many wallets respect this)
    const { chainId: connectedChainId } = await connectAsync({ connector: c, chainId: base.id });

    // If wallet didn’t switch during connect, ask to switch
    if (connectedChainId !== base.id) {
      try { await switchChainAsync({ chainId: base.id }); } catch {}
    }
  }

  const short = useMemo(
    () => (address ? `${address.slice(0, 6)}…${address.slice(-4)}` : ""),
    [address]
  );

  if (isConnected) {
    return (
      <div className="relative">
        <button className="btn-pill btn-pill--yellow" onClick={() => setOpen((v) => !v)}>
          {short} on {chainId === base.id ? "Base" : `Chain ${chainId}`}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-white/15 bg-black/70 backdrop-blur-xl p-2">
            {chainId !== base.id && (
              <button className="w-full nav-pill mb-1" onClick={() => switchChainAsync({ chainId: base.id })}>
                Switch to Base
              </button>
            )}
            <button
              className="w-full btn-ghost"
              onClick={() => { disconnect(); setOpen(false); }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button className="btn-pill btn-pill--blue" onClick={() => setOpen((v) => !v)}>
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
