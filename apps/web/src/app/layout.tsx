import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oppassum.vercel.app"),
  title: {
    default: "Oppassum - P2P WiFi File Sharing",
    template: "%s | Oppassum"
  },
  description:
    "Oppassum is a browser-based P2P file sharing app for transferring files directly across devices over WiFi.",
  applicationName: "Oppassum",
  keywords: [
    "Oppassum",
    "Oppassum file sharing",
    "Oppassum P2P",
    "P2P file sharing",
    "P2P WiFi file sharing",
    "WiFi file sharing",
    "peer to peer transfer",
    "browser file transfer",
    "WebRTC file sharing",
    "local network file transfer"
  ],
  authors: [{ name: "Abdullah Zia" }],
  creator: "Abdullah Zia",
  publisher: "Oppassum",
  manifest: "/manifest.webmanifest",
  alternates: {
    canonical: "/"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1
    }
  },
  openGraph: {
    title: "Oppassum - P2P WiFi File Sharing",
    description:
      "Browser-based P2P file sharing for transferring files directly across devices over WiFi.",
    url: "/",
    siteName: "Oppassum",
    images: [
      {
        url: "/oppassum-logo.png",
        width: 1024,
        height: 1024,
        alt: "Oppassum"
      }
    ],
    locale: "en_US",
    type: "website"
  },
  twitter: {
    card: "summary",
    title: "Oppassum - P2P WiFi File Sharing",
    description: "P2P file sharing over the WiFi.",
    images: ["/oppassum-logo.png"]
  },
  icons: {
    icon: "/oppassum-logo.png",
    apple: "/oppassum-logo.png"
  },
  verification: {
    google: "raUp56p0iH380Bul7djoVgsp5Hw_Ya1gUc6hXjrxknk"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
