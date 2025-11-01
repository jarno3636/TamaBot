// lib/wallet.ts
import { http, createConfig } from "wagmi";
import { base } from "viem/chains";
import { injected, walletConnect, coinbaseWallet } from "@wagmi/connectors";

const WC_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID as string | undefined;
const RPC   = process.env.NEXT_PUBLIC_RPC_URL || "https://mainnet.base.org";

export const wagmiConfig = createConfig({
  ssr: true,
  chains: [base],
  transports: { [base.id]: http(RPC) },
  connectors: [
    injected({ shimDisconnect: true }),
    ...(WC_ID ? [walletConnect({
      projectId: WC_ID,
      showQrModal: true,
      metadata: {
        name: "TamaBot",
        description: "On-chain Farcaster pet on Base",
        url: process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app",
        icons: [ (process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app") + "/icon.png" ],
      },
    })] : []),
    coinbaseWallet({
      appName: "TamaBot",
      appLogoUrl: (process.env.NEXT_PUBLIC_SITE_URL || "https://tamabot.vercel.app") + "/icon.png",
      // If you prefer Smart Wallet only, uncomment:
      // preference: "smartWalletOnly",
    }),
  ],
});
