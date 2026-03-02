/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.basecamp.com",
      },
      {
        protocol: "https",
        hostname: "**.basecamphq.com",
      },
      {
        protocol: "https",
        hostname: "**.basecamp-static.com",
      },
      {
        protocol: "https",
        hostname: "bc3-production-assets-cdn.basecamp-static.com",
      },
    ],
  },
  // Allow ngrok tunnel hostnames (needed for OAuth callbacks in local dev)
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],
};

export default nextConfig;
