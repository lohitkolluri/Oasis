import withPWAInit from '@ducanh2912/next-pwa';
import type { NextConfig } from 'next';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  fallbacks: {
    document: '/~offline',
  },
  // Ensure auth-sensitive navigations always hit the network (avoids stale cached login state in PWA)
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ url }) => {
          const p = url.pathname;
          return (
            p === '/' ||
            p.startsWith('/dashboard') ||
            p.startsWith('/login') ||
            p.startsWith('/register') ||
            p.startsWith('/onboarding')
          );
        },
        handler: 'NetworkFirst',
        method: 'GET',
        options: {
          cacheName: 'auth-pages',
          networkTimeoutSeconds: 5,
          expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 },
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Content-Security-Policy',
            value:
              // NOTE: Keep CSP strict, but allow required third-party widgets.
              // - Razorpay Checkout loads https://checkout.razorpay.com/v1/checkout.js and uses iframes/network to Razorpay domains.
              "default-src 'self'; " +
              "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' https://cdn.brandfetch.io data:; " +
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.razorpay.com https://checkout.razorpay.com; " +
              "frame-src 'self' https://www.openstreetmap.org https://*.openstreetmap.org https://api.razorpay.com https://checkout.razorpay.com;",
          },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'cdn.brandfetch.io', pathname: '/**' }],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', 'framer-motion'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
};

export default withPWA(nextConfig);
