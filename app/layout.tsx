import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AddToHomeScreen } from "@/components/pwa/AddToHomeScreen";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
        className={`${inter.variable} font-sans antialiased min-h-screen bg-[#0a0a0a] text-zinc-100`}
      >
        {children}
        <InstallPrompt />
        <AddToHomeScreen />
      </body>
    </html>
  );
}
