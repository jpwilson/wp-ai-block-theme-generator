import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WP Block Theme Generator",
  description: "AI-powered WordPress Block Theme generator. Native core blocks only — zero Custom HTML.",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        {children}
        <a
          href="https://www.hetzner.com/cloud"
          target="_blank"
          rel="noopener noreferrer"
          title="Self-hosted on Hetzner Cloud (ARM) via Coolify — migrated off Vercel/Railway to cut demo hosting costs"
          style={{
            position: "fixed",
            bottom: 12,
            left: 12,
            zIndex: 9999,
            background: "rgba(17, 24, 39, 0.85)",
            color: "#fff",
            padding: "6px 10px",
            borderRadius: 9999,
            fontSize: 12,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            textDecoration: "none",
            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
            backdropFilter: "blur(4px)",
          }}
        >
          🏠 Hetzner · Coolify
        </a>
      </body>
    </html>
  );
}
