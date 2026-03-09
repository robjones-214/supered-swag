import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Supered Swag Generator ⚡",
  description: "See what your AI agent looks like in Supered swag. Free. No signup.",
  openGraph: {
    title: "Supered Swag Generator ⚡",
    description: "See what your AI agent looks like in Supered swag.",
    url: "https://swag.supered.io",
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
