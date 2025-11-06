"use client";

import { MiniKitProvider } from "@coinbase/onchainkit/minikit";
import { base } from "viem/chains";
import { MiniAppProvider } from "@/contexts/miniapp-context"; // 👈 new
import MiniDiag from "@/components/MiniDiag"; // 👈 optional diagnostic view
// ...rest of your imports (RainbowKit, Wagmi, Neynar, etc.)

export default function Providers({ children }: { children: React.ReactNode }) {
  // ... your theme + Wagmi setup stays the same

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
                {/* 👇 keep Neynar + your actual app children inside */}
                <NeynarProviderLazy>{children}</NeynarProviderLazy>

                {/* 👇 Optional debug readout at bottom of page (remove later) */}
                {process.env.NODE_ENV !== "production" && (
                  <div className="fixed bottom-3 right-3 z-50 w-[280px]">
                    <MiniDiag />
                  </div>
                )}
              </MiniAppProvider>
            </MiniKitProvider>
          </RainbowKitProvider>
        </WagmiProvider>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}
