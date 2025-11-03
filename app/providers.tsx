// app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { useMemo, useEffect, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wallet";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } },
});

function AutoReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => { reconnect(); }, [reconnect]);
  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  const theme = useMemo(() => darkTheme({
    accentColor: "#79ffe1",
    accentColorForeground: "#0a0b12",
    borderRadius: "large",
    overlayBlur: "small",
  }), []);

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AutoReconnect />
        <RainbowKitProvider theme={theme} initialChain={base} modalSize="compact" appInfo={{ appName: "TamaBot" }}>
          {children}
        </RainbowKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
