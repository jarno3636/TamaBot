// types/farcaster-miniapp-sdk.d.ts
declare module "@farcaster/miniapp-sdk" {
  export interface MiniUser {
    fid?: number | string;
    username?: string;
    pfpUrl?: string;   // some builds
    pfp_url?: string;  // others
  }

  export interface MiniContext {
    user?: MiniUser;
  }

  export interface MiniActions {
    ready?: () => Promise<void> | void;
    openUrl?: (url: string | { url: string }) => Promise<void> | void;
    openURL?: (url: string) => Promise<void> | void; // legacy alias
    composeCast?: (args: { text?: string; embeds?: string[] }) => Promise<void> | void;
  }

  export interface MiniSdk {
    isInMiniApp?: () => boolean;
    actions?: MiniActions;
    /** Some clients expose user/context directly */
    user?: MiniUser;
    context?: MiniContext;
  }

  export const sdk: MiniSdk;
  const _default: MiniSdk;
  export default _default;
}

// (optional) global hint for older clients that attach the sdk on window
declare global {
  interface Window {
    farcaster?: { miniapp?: { sdk?: any } };
  }
}
