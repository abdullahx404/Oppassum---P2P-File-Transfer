import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://oppassum.vercel.app"),
  title: "Oppassum",
  description: "P2P file sharing over the WiFi.",
  applicationName: "Oppassum",
  keywords: [
    "Oppassum",
    "P2P file sharing",
    "WiFi file sharing",
    "peer to peer transfer",
    "browser file transfer",
    "WebRTC file sharing"
  ],
  authors: [{ name: "Abdullah Zia" }],
  creator: "Abdullah Zia",
  publisher: "Oppassum",
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: "Oppassum",
    description: "P2P file sharing over the WiFi.",
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
    title: "Oppassum",
    description: "P2P file sharing over the WiFi.",
    images: ["/oppassum-logo.png"]
  },
  icons: {
    icon: "/oppassum-logo.png",
    apple: "/oppassum-logo.png"
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
