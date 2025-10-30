"use client";

import { WagmiProvider } from "wagmi";
import { http, createConfig } from "wagmi";
import { base } from "viem/chains";

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL) },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>;
}
