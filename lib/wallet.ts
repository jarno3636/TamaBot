// lib/wallet.ts
import { http, createConfig } from "wagmi";
import { base } from "viem/chains";
import { injected } from "wagmi/connectors";
import { walletConnect } from "wagmi/connectors";
import { coinbaseWallet } from "wagmi/connectors";

const RPC_URL = (process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org").trim();
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "TamaBot";
const APP_URL  = process.env.NEXT_PUBLIC_APP_URL  || "https://tamabot.vercel.app";
const APP_ICON = process.env.NEXT_PUBLIC_APP_ICON || `${APP_URL}/icon.png`;
const WC_PROJECT_ID = (process.env.NEXT_PUBLIC_WC_PROJECT_ID || "").trim();

export const wagmiConfig = createConfig({
  chains: [base],
  ssr: true,
  // Enforce Base RPC on the client
  transports: { [base.id]: http(RPC_URL) },
  connectors: [
    // 1) Injected (MetaMask, Rabby, Brave, etc.)
    injected({
      shimDisconnect: true,           // persist disconnect state
      target: "metaMask",             // still works with other injected wallets
    }),

    // 2) WalletConnect (mobile deep link + QR; works inside Warpcast too)
    walletConnect({
      projectId: WC_PROJECT_ID,
      metadata: {
        name: APP_NAME,
        description: "On-chain Farcaster pet on Base",
        url: APP_URL,
        icons: [APP_ICON],
      },
      showQrModal: true,
    }),

    // 3) Coinbase Wallet
    coinbaseWallet({
      appName: APP_NAME,
      preference: "all", // allow both DeFi + default experience
      appLogoUrl: APP_ICON,
    }),
  ],
});
