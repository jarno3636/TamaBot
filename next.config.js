/** Dapp Browser Fix Sniper — copy/paste */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Allow dapp browsers (MetaMask, Coinbase, Base, Farcaster Mini Apps)
          { key: "X-Frame-Options", value: "ALLOWALL" },

          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: data: blob:",
              "img-src 'self' https: data: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "connect-src 'self' https: wss:",

              // 🔥 The actual fix — REQUIRED
              "frame-ancestors *",

              // Allow iframe embed (Warpcast, CB Wallet, Base browser)
              "frame-src https: https://warpcast.com https://*.warpcast.com https://*.farcaster.app https://base.app https://base.org https://*.coinbase.com https://*.cb-w.com",

              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
