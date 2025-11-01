// lib/wallet.ts
import { createConfig, http } from "wagmi";
import { base } from "viem/chains";
import { injected } from "wagmi/connectors";
import { walletConnect } from "wagmi/connectors";
import { coinbaseWallet } from "wagmi/connectors";

const RPC =
  (process.env.NEXT_PUBLIC_RPC_URL || process.env.NEXT_PUBLIC_CHAIN_RPC_BASE || "").trim() ||
  "https://mainnet.base.org";

const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || "").trim();

// Build connectors (Injected, WalletConnect, Coinbase)
const connectors = [
  injected({
    shimDisconnect: true, // keeps disconnect state reliable across reloads
  }),
  walletConnect({
    projectId: WC_PROJECT_ID, // REQUIRED for WalletConnect v2
    showQrModal: true,        // shows QR in web; deep-links in mobile
    metadata: {
      name: "TamaBot",
      description: "On-chain Farcaster pet on Base",
      url: process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app",
      icons: ["/favicon.ico"],
    },
  }),
  coinbaseWallet({
    appName: "TamaBot",
    appLogoUrl: "/favicon.ico",
    preference: "all", // allow CB extension & mobile deep-link
  }),
];

export const wagmiConfig = createConfig({
  chains: [base],
  connectors,
  transports: {
    [base.id]: http(RPC),
  },
  pollingInterval: 6_000,
});
