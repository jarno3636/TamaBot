// app/providers.tsx
"use client";

declare global { interface BigInt { toJSON(): string } }
if (typeof (BigInt.prototype as any).toJSON !== "function") {
  (BigInt.prototype as any).toJSON = function () { return this.toString(); };
}

import "@rainbow-me/rainbowkit/styles.css";
import { useMemo, type ReactNode, useEffect, type ComponentType } from "react";
import {
  QueryClient, QueryClientProvider, HydrationBoundary, dehydrate,
} from "@tanstack/react-query";
import { WagmiProvider, useReconnect } from "wagmi";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { base } from "viem/chains";
import { wagmiConfig } from "@/lib/wallet";

// ⬇️ MiniKit + your context
import { MiniKitProvider as _MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { MiniAppProvider } from "@/contexts/miniapp-context";

// Safe alias to bypass stale type defs in some versions
const MiniKitProvider = _MiniKitProvider as unknown as ComponentType<{
  projectId?: string;
  chain?: any;
  notificationProxyUrl?: string;
  children?: React.ReactNode;
}>;

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

/** Safe Neynar provider — never throws if lib or clientId are missing */
function NeynarProviderLazy({ children }: { children: ReactNode }) {
  const clientId =
    (typeof window !== "undefined" && process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID) ||
    process.env.NEXT_PUBLIC_NEYNAR_CLIENT_ID;

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
            {/* TS-safe MiniKit usage */}
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
