import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployments
  output: 'standalone',

  // Configure allowed image sources for next/image
  images: {
    remotePatterns: [
      // Local MinIO development
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
      },
      // Docker MinIO
      {
        protocol: 'http',
        hostname: 'minio',
        port: '9000',
      },
      // AWS S3 (production)
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;
