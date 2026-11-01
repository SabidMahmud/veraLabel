import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/uc/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/slides/:path*',
        destination: 'http://127.0.0.1:8090/slides/:path*',
      },
    ];
  },
}

export default nextConfig;
