// app/providers.tsx
"use client";

// ---- small polyfill so BigInt serializes cleanly in React Query cache ----
declare global { interface BigInt { toJSON(): string } }
if (typeof (BigInt.prototype as any).toJSON !== "function") {
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
}

import "@rainbow-me/rainbowkit/styles.css";
import React, { useEffect, useMemo, type ReactNode } from "react";

// TanStack Query
import {
  QueryClient,
  QueryClientProvider,
  HydrationBoundary,
  dehydrate,
} from "@tanstack/react-query";

// Wagmi / RainbowKit
import { WagmiProvider, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wallet";

// Farcaster Mini App / OnchainKit
import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniAppProvider } from "@/contexts/miniapp-context";

// ---------- React Query setup ----------
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});
function serializeData(data: unknown): unknown {
  if (typeof data === "bigint") return data.toString();
  return data;
}

// ---------- Wagmi auto-reconnect ----------
function AutoReconnect() {
  const { reconnect } = useReconnect();
  useEffect(() => { reconnect(); }, [reconnect]);
  return null;
}

// ---------- Neynar provider (safe no-op if lib/ID missing) ----------
function NeynarProviderLazy({ children }: { children: ReactNode }) {
  const clientId =
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

  // Mark not-ready by default (optional debug flag your other code can read)
  useEffect(() => {
    if (typeof window !== "undefined") (window as any).__NEYNAR_READY__ = false;
  }, []);

  if (!clientId) return <>{children}</>;

  let Provider: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@neynar/react");
    Provider = mod?.NeynarProvider ?? mod?.default ?? null;
  } catch {
    Provider = null;
  }
  if (!Provider) return <>{children}</>;

  function Flag() {
    useEffect(() => {
      if (typeof window !== "undefined") (window as any).__NEYNAR_READY__ = true;
    }, []);
    return null;
  }

  return (
    <Provider clientId={clientId}>
      <Flag />
      {children}
    </Provider>
  );
}

// ---------- Top-level Providers ----------
export default function Providers({ children }: { children: ReactNode }) {
  const theme = useMemo(
    () =>
      darkTheme({
        accentColor: "#79ffe1",
        accentColorForeground: "#0a0b12",
        borderRadius: "large",
        overlayBlur: "small",
      }),
    []
  );

  const dehydratedState = dehydrate(queryClient, { serializeData });

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <WagmiProvider config={wagmiConfig}>
          <AutoReconnect />
          <RainbowKitProvider
            theme={theme}
            initialChain={base}
            modalSize="compact"
            appInfo={{ appName: "TamaBot" }}
          >
            <MiniKitProvider
              projectId={process.env.NEXT_PUBLIC_MINIKIT_PROJECT_ID as string}
              chain={base}
              notificationProxyUrl="/api/notification"
            >
              <MiniAppProvider>
                <NeynarProviderLazy>{children}</NeynarProviderLazy>
              </MiniAppProvider>
            </MiniKitProvider>
          </RainbowKitProvider>
        </WagmiProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
