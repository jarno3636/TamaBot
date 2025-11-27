// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Let wallets / Warpcast / dapps embed the site
          { key: "X-Frame-Options", value: "ALLOWALL" },

          // Keep CORS simple + permissive (fine for a public dapp front-end)
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,OPTIONS" },

          // Minimal CSP: just allow everyone to frame you.
          // (If we over-constrain CSP here, some in-app browsers just show white.)
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors *",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
