// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Remove/override X-Frame-Options so hosts can embed
          { key: "X-Frame-Options", value: "" },
          // Allow Farcaster/Warpcast to frame your app
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: data: blob:",
              "img-src 'self' https: data: blob:",
              "style-src 'self' 'unsafe-inline' https:",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
              "connect-src 'self' https: wss:",
              "frame-src https://*.farcaster.xyz https://warpcast.com https://*.warpcast.com https:",
              "frame-ancestors 'self' https://*.farcaster.xyz https://warpcast.com https://*.warpcast.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // Silence "Can't resolve 'pino-pretty'" warnings (harmless alias)
    config.resolve.alias = { ...(config.resolve.alias || {}), "pino-pretty": false };
    return config;
  },
};

module.exports = nextConfig;
