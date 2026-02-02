// app/providers.tsx
"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@coinbase/onchainkit/styles.css";

import React, { useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, type Config } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniContextProvider } from "@/lib/useMiniContext";
import { makeWagmiConfig } from "@/lib/wallet";

/* ---------------- React Query ---------------- */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

function detectMiniApp(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /warpcast|farcaster/i.test(ua) || Boolean((window as any).farcaster);
}

/* ---------------- Root Providers ---------------- */
export default function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [wagmi, setWagmi] = useState<Config | null>(null);
  const [isMini, setIsMini] = useState(false);

  useEffect(() => {
    setMounted(true);

    const mini = detectMiniApp();
    setIsMini(mini);

    // ✅ lazy init wagmi AFTER mount (prevents WalletConnect/handlers from firing during build/boot)
    setWagmi(makeWagmiConfig());
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

  // Never return null; show a stable placeholder until wagmi is ready
  if (!mounted || !wagmi) {
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
      <WagmiProvider config={wagmi}>
        <OnchainKitProvider apiKey={onchainkitApiKey} chain={base}>
          <RainbowKitProvider
            theme={theme}
            initialChain={base}
            modalSize="compact"
            appInfo={{ appName: "Basebots" }}
          >
            {isMini ? (
              <MiniKitProvider
                chain={base}
                notificationProxyUrl="/api/notification"
              >
                <MiniContextProvider>{children}</MiniContextProvider>
              </MiniKitProvider>
            ) : (
              <MiniContextProvider>{children}</MiniContextProvider>
            )}
          </RainbowKitProvider>
        </OnchainKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}
