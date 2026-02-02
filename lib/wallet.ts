// lib/wallet.ts
"use client";

import { http, createConfig, createStorage, cookieStorage } from "wagmi";
import { base } from "viem/chains";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  rainbowWallet,
  rabbyWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";

import { injected } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

/* ───────── Env ───────── */

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_ID ||
  "";

const FRONTEND_RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";

/* ───────── Detect MiniApp ───────── */

const isMiniApp =
  typeof window !== "undefined" &&
  (window as any).farcaster !== undefined;

/* ───────── Wallets ───────── */

const walletGroups = [
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
];

const rkConnectors = connectorsForWallets(walletGroups, {
  appName: "Basebots",
  projectId,
});

/* ───────── Wagmi Config ───────── */

export const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(FRONTEND_RPC, {
      timeout: 20_000,
      retryCount: 2,
      retryDelay: 300,
    }),
  },

  connectors: [
    farcasterMiniApp(),
    injected({ shimDisconnect: true }),
    ...rkConnectors,
  ],

  // 🚨 THIS IS THE KEY FIX
  storage: isMiniApp
    ? undefined // ❌ NO IndexedDB / persistence in MiniApp
    : createStorage({ storage: cookieStorage }),

  ssr: false, // 🚨 REQUIRED for MiniApp stability
});
