import "@fontsource/material-symbols-rounded";

import type { Metadata } from "next";

import MaterialWebProvider from "@/components/material/MaterialWebProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Video Streaming",
  description: "Material 3 video streaming platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MaterialWebProvider>
          {children}
        </MaterialWebProvider>
      </body>
    </html>
  );
}