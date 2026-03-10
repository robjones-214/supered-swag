import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supered Swag Generator ⚡",
  description: "See what your AI agent looks like in Supered swag. Paste your URL. Free. No signup.",
  openGraph: {
    title: "Supered Swag Generator ⚡",
    description: "See what your AI agent looks like in Supered swag. Paste your URL — we'll generate a custom image.",
    url: "https://swag.supered.io",
    type: "website",
    images: [
      {
        url: "https://swag.supered.io/og-default.png",
        width: 1200,
        height: 630,
        alt: "Supered Swag Generator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Supered Swag Generator ⚡",
    description: "See what your AI agent looks like in Supered swag.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
