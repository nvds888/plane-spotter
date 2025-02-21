import type { NextConfig } from "next";
import withPWA from '@ducanh2912/next-pwa';
import { webpackFallback } from '@txnlab/use-wallet-react'


interface PWAConfig {
  dest: string;
  register: boolean;
  skipWaiting: boolean;
  disable?: boolean;
  buildExcludes?: RegExp[];
  runtimeCaching?: Array<{
    urlPattern: RegExp;
    handler: string;
    options?: {
      cacheName?: string;
      networkTimeoutSeconds?: number;
      expiration?: {
        maxEntries?: number;
        maxAgeSeconds?: number;
      };
      cacheableResponse?: {
        statuses: number[];
      };
    };
  }>;
}

const pwaConfig: PWAConfig = {
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/plane-spotter-backend\.onrender\.com\/api/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 // 1 hour
        }
      }
    },
    {
      urlPattern: /\/_next\/image\?url/,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    },
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'https-calls',
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60 // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    }
  ]
};

const nextConfig: NextConfig = withPWA(pwaConfig)({
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'unpkg.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ...webpackFallback
      }
    }
    return config
  }
});



export default nextConfig;
