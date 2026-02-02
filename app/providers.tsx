// app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@coinbase/onchainkit/styles.css";

import React, { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wallet";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniContextProvider } from "@/lib/useMiniContext";

/* ---------------- React Query ---------------- */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

/* ---------------- Wallet auto-reconnect ---------------- */
function AutoReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => {
    reconnect();
  }, [reconnect]);
  return null;
}

/* ---------------- Root Providers ---------------- */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  /**
   * 🚨 CRITICAL:
   * Never return `null` from Providers.
   * This placeholder prevents hydration + IndexedDB crashes.
   */
  if (!mounted) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 800,
          letterSpacing: "0.12em",
          fontSize: 14,
        }}
      >
        INITIALIZING…
      </div>
    );
  }

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
              <MiniContextProvider>
                {children}
              </MiniContextProvider>
            </MiniKitProvider>
          </RainbowKitProvider>
        </OnchainKitProvider>

      </WagmiProvider>
    </QueryClientProvider>
  );
}
