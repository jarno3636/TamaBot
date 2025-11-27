/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,OPTIONS",
          },
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://warpcast.com https://*.warpcast.com https://*.farcaster.xyz *",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
