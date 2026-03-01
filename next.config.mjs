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
};

export default nextConfig;
