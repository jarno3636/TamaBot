/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" }, // harmless but basically ignored

          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: data: blob:",
              "img-src 'self' https: data: blob:",
              "media-src 'self' https: blob:",
              "font-src 'self' https: data:",
              "style-src 'self' 'unsafe-inline' https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "connect-src 'self' https: wss:",
              // 👇 key change
              "frame-ancestors *",
              "frame-src https://warpcast.com https://*.warpcast.com https://*.farcaster.app https://coinbase.com https://*.coinbase.com https://cb-w.com https://*.cb-w.com https:",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
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
    config.resolve.alias = { ...(config.resolve.alias || {}), "pino-pretty": false };
    return config;
  },
};

module.exports = nextConfig;
