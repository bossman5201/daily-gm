import type { Metadata, Viewport } from "next";
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

export const viewport: Viewport = {
  viewportFit: 'cover',
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

          <footer className="relative z-10 w-full pt-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center text-[10px] text-white/20 space-y-2 pointer-events-auto">
            <div className="flex justify-center gap-4 uppercase tracking-widest font-bold">
              <a href="/terms" className="hover:text-white/50 transition-colors">Terms</a>
              <a href="/privacy" className="hover:text-white/50 transition-colors">Privacy</a>
            </div>
            <p className="max-w-md mx-auto leading-relaxed px-4">
              Not a lottery. No guaranteed prizes. Streak is a vanity metric only.
              <br />
              By using this app, you accept the risks of blockchain transactions.
            </p>
          </footer>

          <Toaster position="bottom-right" theme="dark" />
        </Providers>
      </body>
    </html>
  );
}
