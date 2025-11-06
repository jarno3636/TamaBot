"use client";

import "@rainbow-me/rainbowkit/styles.css";
import "@coinbase/onchainkit/styles.css";

import React, { useMemo, type ReactNode, useEffect } from "react";
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";
import { WagmiProvider, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wallet";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniContextProvider } from "@/lib/useMiniContext";

// ---- BigInt JSON polyfill ---------------------------------------------------
declare global { interface BigInt { toJSON(): string } }
if (typeof (BigInt.prototype as any).toJSON !== "function") {
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
}

// ---- React Query setup ------------------------------------------------------
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } },
});
function serializeData(data: unknown) {
  return typeof data === "bigint" ? data.toString() : data;
}

// ---- Auto-reconnect wallet on mount ----------------------------------------
function AutoReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => { reconnect(); }, [reconnect]);
  return null;
}

// ---- Lazy Neynar provider (optional) ---------------------------------------
function NeynarProviderLazy({ children }: { children: ReactNode }) {
  const clientId =
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

  if (!clientId) return <>{children}</>;

  let Provider: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: any = require("@neynar/react");
    Provider = mod?.NeynarProvider ?? mod?.default ?? null;
  } catch {}
  if (!Provider) return <>{children}</>;
  return <Provider clientId={clientId}>{children}</Provider>;
}

// ---- Root Providers ---------------------------------------------------------
export default function Providers({ children }: { children: ReactNode }) {
  const theme = useMemo(() => darkTheme({
    accentColor: "#79ffe1",
    accentColorForeground: "#0a0b12",
    borderRadius: "large",
    overlayBlur: "small",
  }), []);

  const dehydratedState = dehydrate(queryClient, { serializeData });

  // CDP/OnchainKit API key (fallback keeps old var working)
  const onchainkitApiKey =
    (process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY ||
      process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID ||
      "") as string;

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <WagmiProvider config={wagmiConfig}>
          <AutoReconnect />
          <OnchainKitProvider apiKey={onchainkitApiKey} chain={base}>
            <RainbowKitProvider
              theme={theme}
              initialChain={base}
              modalSize="compact"
              appInfo={{ appName: "TamaBot" }}
            >
              {/* MiniKitProvider: no apiKey prop */}
              <MiniKitProvider chain={base} notificationProxyUrl="/api/notification">
                {/* Global Farcaster identity (fid/user) available everywhere */}
                <MiniContextProvider>
                  <NeynarProviderLazy>{children}</NeynarProviderLazy>
                </MiniContextProvider>
              </MiniKitProvider>
            </RainbowKitProvider>
          </OnchainKitProvider>
        </WagmiProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
