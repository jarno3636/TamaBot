"use client";

import { WagmiProvider } from "wagmi";
import { http, createConfig } from "wagmi";
import { base } from "viem/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const wagmiConfig = createConfig({
  chains: [base],
  transports: { [base.id]: http(process.env.NEXT_PUBLIC_RPC_URL) },
});

const queryClient = new QueryClient();

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
