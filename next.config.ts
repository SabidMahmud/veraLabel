import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'drive.google.com',
        pathname: '/uc/**',
      },
    ],
  },
  typescript: {
    // Skip type checking during build to reduce memory usage
    ignoreBuildErrors: true,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
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
