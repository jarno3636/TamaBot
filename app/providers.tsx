// app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@coinbase/onchainkit/styles.css";

import React, { useEffect, useMemo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wallet";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniContextProvider } from "@/lib/useMiniContext";

/* ---------------- React Query (simple) ---------------- */
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

/* ------------------- Root Providers ------------------- */
export default function Providers({ children }: { children: React.ReactNode }) {
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

  // CDP/OnchainKit API key (fallback keeps old var working)
  const onchainkitApiKey =
    (process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ||
      process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID ||
      "") as string;

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
            {/* MiniKitProvider: no apiKey prop */}
            <MiniKitProvider chain={base} notificationProxyUrl="/api/notification">
              {/* Global Farcaster identity (fid/user) available everywhere */}
              <MiniContextProvider>{children}</MiniContextProvider>
            </MiniKitProvider>
          </RainbowKitProvider>
        </OnchainKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
