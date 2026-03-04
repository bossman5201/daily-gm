'use client';

import { useEffect, useCallback } from 'react';
import { GMButton } from './components/GMButton';
import { Header } from './components/Header';
import { LiveFeed } from './components/LiveFeed';
import { Leaderboard } from './components/Leaderboard';
import { PersonalStats } from './components/PersonalStats';
import { GlobalStats } from './components/GlobalStats';
import { AdminPanel } from './components/AdminPanel';
import { HeatMap } from './components/HeatMap';
import { OnboardingModal } from './components/OnboardingModal';
import { GMProvider } from './context/GMContext';

export default function Home() {
  // Signal to the Base App that the mini app is ready
  // Uses manual SDK import (SSR-safe) — useMiniKit() throws during prerendering
  const initMiniApp = useCallback(async () => {
    try {
      const { sdk } = await import('@farcaster/miniapp-sdk');
      sdk.actions.ready({ disableNativeGestures: true });

      // Prompt the user to add the Mini App + enable notifications
      // This triggers the webhook with their notification token if they accept
      sdk.actions.addFrame();
    } catch {
      // Not running inside a Mini App context — safe to ignore
    }
  }, []);

  useEffect(() => {
    initMiniApp();
  }, [initMiniApp]);

  return (
    <GMProvider>
      <main className="min-h-dvh flex flex-col selection:bg-[#0052FF] selection:text-white overflow-x-hidden">
        <OnboardingModal />
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 pb-32 pt-12">

          {/* Hero Section */}
          <div className="flex flex-col items-center gap-6 mb-16">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-500 animate-gradient-x py-2">
              DAILY GM
            </h1>
            <h2 className="text-sm md:text-lg font-medium text-center text-white/60 uppercase tracking-[0.3em]">
              It's time to say it.
            </h2>

            <GMButton />


            <PersonalStats />
            <HeatMap />
          </div>

          {/* Global Counter */}
          <GlobalStats />

          {/* Live Data */}
          <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-8">
            <LiveFeed />
            <Leaderboard />
          </div>
        </div>
        <AdminPanel />
      </main>
    </GMProvider>
  );
}
