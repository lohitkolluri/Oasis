import { AddToHomeScreen } from '@/components/pwa/AddToHomeScreen';
import { InstallPrompt } from '@/components/pwa/InstallPrompt';
import { GoeyToaster } from '@/components/ui/GoeyToaster';
import { cn } from '@/lib/utils';
import type { Metadata, Viewport } from 'next';
import { Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://oasis-app.vercel.app'),
  title: {
    default: 'Oasis — AI-Powered Income Protection for Delivery Partners',
    template: '%s | Oasis',
  },
  description:
    "Weekly parametric wage protection for India's Q-commerce delivery partners. Automated payouts when disruptions strike — no claims paperwork.",
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Oasis',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    siteName: 'Oasis',
    title: 'Oasis — AI-Powered Income Protection for Delivery Partners',
    description:
      "Weekly parametric wage protection for India's Q-commerce delivery partners. Automated payouts when disruptions strike.",
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Oasis — Income Protection for Delivery Partners',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Oasis — AI-Powered Income Protection',
    description: "Weekly parametric wage protection for India's Q-commerce delivery partners.",
    images: ['/og-image.png'],
  },
};

export const viewport: Viewport = {
  themeColor: '#3AA76D',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('dark', 'font-sans', geist.variable)}>
      <body
        className={`${geist.variable} ${mono.variable} font-sans antialiased min-h-screen bg-black text-white`}
      >
        {children}
        <GoeyToaster />
        <InstallPrompt />
        <AddToHomeScreen />
      </body>
    </html>
  );
}
