// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Remove X-Frame-Options entirely
          { key: "X-Frame-Options", value: "" },
          // Allow Warpcast/Farcaster to frame your app
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self' https: data: blob:",
              // allow framing by Farcaster hosts
              "frame-ancestors 'self' https://*.farcaster.xyz https://warpcast.com https://*.warpcast.com",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
