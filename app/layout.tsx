import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";
import { GoeyToaster } from "@/components/ui/GoeyToaster";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-display",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Oasis — Income protection for delivery partners",
  description:
    "AI-powered parametric wage protection for India's Q-commerce delivery partners.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Oasis",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#059669",
  width: "device-width",
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
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${geist.variable} ${geistMono.variable} font-sans antialiased min-h-screen bg-[#0f0f0f] text-white`}
      >
        {children}
        <GoeyToaster />
        <InstallPrompt />
        <AddToHomeScreen />
      </body>
    </html>
  );
}
