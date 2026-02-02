"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@coinbase/onchainkit/styles.css";

import React, { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniContextProvider } from "@/lib/useMiniContext";
import { createWagmiConfig } from "@/lib/wallet";

/* ---------------- React Query ---------------- */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

/* --------------- Auto-reconnect wallet ---------------- */
function AutoReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => {
    reconnect();
  }, [reconnect]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [wagmiConfig, setWagmiConfig] = useState<any>(null);

  useEffect(() => {
    setMounted(true);
    setWagmiConfig(createWagmiConfig());
  }, []);

  if (!mounted || !wagmiConfig) return null; // 🚫 prevents IndexedDB crash

  const theme = useMemo(
    () =>
      darkTheme({
        accentColor: "#79ffe1",
        accentColorForeground: "#0a0b12",
        borderRadius: "large",
        overlayBlur: "small",
      }),
    [],
  );

  const onchainkitApiKey =
    process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ||
    process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID ||
    "";

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <AutoReconnect />
        <OnchainKitProvider apiKey={onchainkitApiKey} chain={base}>
          <RainbowKitProvider
            theme={theme}
            initialChain={base}
            modalSize="compact"
            appInfo={{ appName: "Basebots" }}
          >
            <MiniKitProvider
              chain={base}
              notificationProxyUrl="/api/notification"
            >
              <MiniContextProvider>{children}</MiniContextProvider>
            </MiniKitProvider>
          </RainbowKitProvider>
        </OnchainKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
