import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@coinbase/onchainkit/styles.css'; // Add OnchainKit styles
import { Providers } from "./providers";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://daily-gm-zeta.vercel.app';

export const metadata: Metadata = {
  title: "Daily GM",
  description: "Say GM on Base every day to build your streak.",
  other: {
    'base:app_id': '6994873ce0d5d2cf831b5f0c',
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: `${APP_URL}/splash.png`,
      button: {
        title: 'Say GM ☀️',
        action: {
          type: 'launch_miniapp',
          name: 'Daily GM',
          url: APP_URL,
          splashImageUrl: `${APP_URL}/splash.png`,
          splashBackgroundColor: '#000000',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="aurora-bg" />
        <Providers>
          {children}
          <Toaster position="bottom-right" theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
