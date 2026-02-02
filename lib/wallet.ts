// lib/wallet.ts
"use client";

import { http, cookieStorage, createStorage, createConfig } from "wagmi";
import { base } from "viem/chains";
import { injected } from "wagmi/connectors";
import { farcasterMiniApp as miniAppConnector } from "@farcaster/miniapp-wagmi-connector";

// RainbowKit is optional at runtime, but safe to include for web usage
import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  rabbyWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

function detectMiniApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  // covers Warpcast / Farcaster embedded webviews
  return /warpcast|farcaster/i.test(ua) || Boolean((window as any).farcaster);
}

export function makeWagmiConfig() {
  const isMini = detectMiniApp();

  const projectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    process.env.NEXT_PUBLIC_WALLETCONNECT_ID ||
    "";

  const FRONTEND_RPC =
    process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

  // ✅ Always include MiniApp connector (it’s how Warpcast wants you to connect)
  const baseConnectors = [
    miniAppConnector(),
    injected({ target: "coinbaseWallet", shimDisconnect: true }),
  ];

  // ✅ Only include WalletConnect + large wallet lists on “normal web”
  const rkConnectors = !isMini
    ? connectorsForWallets(
        [
          {
            groupName: "Popular",
            wallets: [
              injectedWallet,
              metaMaskWallet,
              coinbaseWallet,
              rainbowWallet,
              rabbyWallet,
              walletConnectWallet,
            ],
          },
        ],
        { appName: "TamaBot", projectId },
      )
    : [];

  return createConfig({
    chains: [base],
    transports: {
      [base.id]: http(FRONTEND_RPC, {
        timeout: 20_000,
        retryCount: 2,
        retryDelay: 300,
      }),
    },

    // ✅ IMPORTANT: in this architecture, we’re client-only; avoid SSR wallet init weirdness
    ssr: false,

    // ✅ cookieStorage is fine; avoid localStorage/IndexedDB assumptions
    storage: createStorage({ storage: cookieStorage }),

    connectors: [...baseConnectors, ...rkConnectors],
  });
}
