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

/** Hardened Neynar wrapper: never throws, only runs when enabled + clientId set */
function NeynarProviderSafe({ children }: { children: ReactNode }) {
  const enabled =
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_ENABLED === "true") ||
    process.env.NEXT_PUBLIC_NEYNAR_ENABLED === "true";

  const clientId =
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

  if (!enabled || !clientId) return <>{children}</>;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const neynar = require("@neynar/react");
    const Provider = neynar.NeynarProvider || neynar.default;
    if (!Provider) return <>{children}</>;

    // Their widgets sometimes expect Theme; if it exists, use it. If not, just Provider.
    const Theme = neynar.Theme || ((p: any) => <>{p.children}</>);
    return (
      <Provider clientId={clientId}>
        <Theme>{children}</Theme>
      </Provider>
    );
  } catch {
    // Package/peer deps not present → silently skip
    return <>{children}</>;
  }
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
            <NeynarProviderSafe>{children}</NeynarProviderSafe>
          </RainbowKitProvider>
        </WagmiProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
