// app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@coinbase/onchainkit/styles.css";

import React, { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
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

/* ---------------- Root Providers ---------------- */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [isMiniApp, setIsMiniApp] = useState(false);

  useEffect(() => {
    setMounted(true);

    // ✅ Detect Farcaster MiniApp safely
    if (typeof window !== "undefined" && (window as any).farcaster) {
      setIsMiniApp(true);
    }
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

  // 🚨 NEVER return null from providers
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
        <OnchainKitProvider apiKey={onchainkitApiKey} chain={base}>
          <RainbowKitProvider
            theme={theme}
            initialChain={base}
            modalSize="compact"
            appInfo={{ appName: "Basebots" }}
          >
            {isMiniApp ? (
              <MiniKitProvider
                chain={base}
                notificationProxyUrl="/api/notification"
              >
                <MiniContextProvider>{children}</MiniContextProvider>
              </MiniKitProvider>
            ) : (
              // ✅ Normal web fallback (NO MiniKit)
              <MiniContextProvider>{children}</MiniContextProvider>
            )}
          </RainbowKitProvider>
        </OnchainKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
