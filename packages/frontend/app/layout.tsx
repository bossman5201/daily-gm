import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import '@coinbase/onchainkit/styles.css'; // Add OnchainKit styles
import { Providers } from "./providers";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Daily GM",
  description: "Say GM on Base every day to build your streak.",
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
