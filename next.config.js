// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cdn.neynar.com" },
      { protocol: "https", hostname: "i.imgur.com" },
      { protocol: "https", hostname: "**.warpcast.com" },
      { protocol: "https", hostname: "**.cloudflare-ipfs.com" },
      { protocol: "https", hostname: "**" } // (broad fallback; tighten later if you prefer)
    ],
  },
};
module.exports = nextConfig;
