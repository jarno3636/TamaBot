// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Global headers (apply to everything)
        source: "/:path*",
        headers: [
          // Allows framing (modern browsers mostly ignore this when CSP is present,
          // but it's harmless and keeps older stuff happy)
          { key: "X-Frame-Options", value: "ALLOWALL" },

          {
            key: "Content-Security-Policy",
            value: [
              // Core
              "default-src 'self' https: data: blob:",
              "img-src 'self' https: data: blob:",
              "media-src 'self' https: blob:",
              "font-src 'self' https: data:",
              "style-src 'self' 'unsafe-inline' https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "connect-src 'self' https: wss:",
              // ✅ Let Farcaster / Base / Coinbase / tooling embed your app
              "frame-ancestors *",
              // ✅ If you embed iframes, allow them to be from https (plus these known hosts)
              "frame-src https: https://warpcast.com https://*.warpcast.com https://*.farcaster.app https://base.app https://base.dev https://*.coinbase.com https://*.cb-w.com",
              // Workers (if you use them)
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },

      // Ensure manifest is served with correct content type (no redirects)
      {
        source: "/.well-known/farcaster.json",
        headers: [
          { key: "Content-Type", value: "application/json; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=300, must-revalidate" },
        ],
      },
    ];
  },

  webpack: (config) => {
    // Silence optional dependency warnings (harmless)
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
    };
    return config;
  },
};

module.exports = nextConfig;
