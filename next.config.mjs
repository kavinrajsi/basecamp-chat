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
    ],
  },
  // Allow ngrok tunnel hostnames (needed for OAuth callbacks in local dev)
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],
};

export default nextConfig;
