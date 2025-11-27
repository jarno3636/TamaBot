// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        // Global headers (apply to everything)
        source: "/:path*",
        headers: [
          // ✅ Allow embedding in any frame (Warpcast, Base, Coinbase, in-app browsers, etc.)
          { key: "X-Frame-Options", value: "ALLOWALL" },

          // (Optional) some mild, non-breaking security headers
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "interest-cohort=()" },
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
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "pino-pretty": false,
    };
    return config;
  },
};

module.exports = nextConfig;
