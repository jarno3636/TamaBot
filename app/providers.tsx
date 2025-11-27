// app/providers.tsx
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

/* ---------------- BigInt JSON polyfill (SUPER SAFE) ---------------- */
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

if (typeof window !== "undefined") {
  try {
    if (
      typeof BigInt !== "undefined" &&
      typeof (BigInt.prototype as any).toJSON !== "function"
    ) {
      (BigInt.prototype as any).toJSON = function () {
        return this.toString();
      };
    }
  } catch {
    // If the environment doesn't like BigInt at all, do nothing.
  }
}

/* ---------------- React Query setup ------------------- */
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, refetchOnWindowFocus: false } },
});
function serializeData(data: unknown) {
  return typeof data === "bigint" ? data.toString() : data;
}

/* --------------- Auto-reconnect wallet ---------------- */
function AutoReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => {
    reconnect();
  }, [reconnect]);
  return null;
}

/* ---------- Neynar providers (lazy, safe load) --------- */
function NeynarProviders({ children }: { children: ReactNode }) {
  const clientId =
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

  let MiniAppProvider: React.ComponentType<any> | null = null;
  let NeynarProvider: React.ComponentType<any> | null = null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod: any = require("@neynar/react");
    MiniAppProvider = mod?.MiniAppProvider ?? null;
    NeynarProvider = mod?.NeynarProvider ?? mod?.default ?? null;
  } catch {
    // package not present — ignore, render bare children
  }

  if (!MiniAppProvider && !NeynarProvider) return <>{children}</>;

  if (MiniAppProvider) {
    return (
      <MiniAppProvider>
        {clientId && NeynarProvider ? (
          <NeynarProvider clientId={clientId}>{children}</NeynarProvider>
        ) : (
          children
        )}
      </MiniAppProvider>
    );
  }

  if (clientId && NeynarProvider) {
    return <NeynarProvider clientId={clientId}>{children}</NeynarProvider>;
  }

  return <>{children}</>;
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

  const dehydratedState = dehydrate(queryClient, { serializeData });

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
              appInfo={{ appName: "Basebots" }}
            >
              <MiniKitProvider chain={base} notificationProxyUrl="/api/notification">
                <MiniContextProvider>
                  <NeynarProviders>{children}</NeynarProviders>
                </MiniContextProvider>
              </MiniKitProvider>
            </RainbowKitProvider>
          </OnchainKitProvider>
        </WagmiProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
