// lib/wallet.ts
"use client";

import { http, cookieStorage, createStorage, createConfig } from "wagmi";
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

/* ---------------- WalletConnect Project ID ---------------- */
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_WALLETCONNECT_ID ||
  "";

/* ---------------- RainbowKit wallets ---------------- */
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

/* ---------------- RPC ---------------- */
const FRONTEND_RPC =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ||
  "https://mainnet.base.org";

/* ---------------- ✅ EXPORT THIS ---------------- */
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
  ssr: true,
  storage: createStorage({
    storage: cookieStorage,
  }),
});
