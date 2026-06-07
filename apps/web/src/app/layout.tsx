import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Oppassum",
  description: "No-login peer-to-peer browser file sharing."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
