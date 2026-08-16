import type { NextConfig } from 'next';

const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];

// Product images can live on any S3-compatible/object-storage host. The host is
// configuration, not code, so it is read from the environment at build time.
if (process.env.NEXT_PUBLIC_IMAGE_HOST) {
  remotePatterns.push({
    protocol: 'https',
    hostname: process.env.NEXT_PUBLIC_IMAGE_HOST,
  });
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Bangladesh mobile networks are often slow: ship the smallest possible
  // formats and keep optimized images cached for a long time.
  images: {
    remotePatterns,
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    deviceSizes: [320, 420, 640, 768, 1024, 1280],
    imageSizes: [64, 96, 128, 192, 256],
  },
  experimental: {
    // Tree-shake MUI so low-end phones do not download the whole library.
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
};

export default nextConfig;
