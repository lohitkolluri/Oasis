import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Oasis: Income protection for delivery partners',
    short_name: 'Oasis',
    description:
      "AI-powered parametric wage protection for India's Q-commerce delivery partners. Rider & Admin app.",
    start_url: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    launch_handler: {
      client_mode: 'navigate-existing',
    },
    background_color: '#0f0f0f',
    theme_color: '#059669',
    orientation: 'portrait-primary',
    scope: '/',
    icons: [
      {
        src: '/pwa-icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['finance', 'business'],
    shortcuts: [
      {
        name: 'My Policy',
        short_name: 'Policy',
        description: 'Weekly cover, limits & documents',
        url: '/dashboard/policy',
        icons: [{ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
      {
        name: 'Claims',
        short_name: 'Claims',
        description: 'Payout history & verification',
        url: '/dashboard/claims',
        icons: [{ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
      {
        name: 'Report disruption',
        short_name: 'Report',
        description: 'Self-report delivery impact with evidence',
        url: '/dashboard?report=1',
        icons: [{ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
      {
        name: 'Wallet',
        short_name: 'Wallet',
        description: 'Balance & weekly earnings',
        url: '/dashboard/wallet',
        icons: [{ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
      {
        name: 'Rider home',
        short_name: 'Home',
        description: 'Dashboard, alerts & quick actions',
        url: '/dashboard',
        icons: [{ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
      {
        name: 'Admin',
        short_name: 'Admin',
        description: 'Triggers, fraud & policies',
        url: '/admin',
        icons: [{ src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }],
      },
    ],
  };
}
