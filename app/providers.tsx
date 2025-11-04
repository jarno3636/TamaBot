// app/providers.tsx
"use client";

declare global { interface BigInt { toJSON(): string } }
if (typeof (BigInt.prototype as any).toJSON !== "function") {
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
}

import "@rainbow-me/rainbowkit/styles.css";
import { useMemo, type ReactNode, useEffect } from "react";
import {
  QueryClient, QueryClientProvider, HydrationBoundary, dehydrate,
} from "@tanstack/react-query";
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

function serializeData(data: unknown): unknown {
  if (typeof data === "bigint") return data.toString();
  return data;
}

/** Lazy Neynar provider so build never fails */
function NeynarProviderLazy({ children }: { children: ReactNode }) {
  const clientId =
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

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

  return <Provider clientId={clientId}>{children}</Provider>;
}

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
            <NeynarProviderLazy>{children}</NeynarProviderLazy>
          </RainbowKitProvider>
        </WagmiProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
