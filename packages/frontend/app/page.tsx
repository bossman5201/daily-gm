'use client';

import { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { GMButton } from './components/GMButton';
import { Header } from './components/Header';
import { LiveFeed } from './components/LiveFeed';
import { Leaderboard } from './components/Leaderboard';
import { PersonalStats } from './components/PersonalStats';
import { AdminPanel } from './components/AdminPanel';

export default function Home() {
  // Signal to the Base App that the mini app is ready
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <main className="min-h-screen flex flex-col selection:bg-[#0052FF] selection:text-white overflow-x-hidden">
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
        </div>

        {/* Live Data */}
        <div className="w-full max-w-md grid grid-cols-1 md:grid-cols-2 gap-8">
          <LiveFeed />
          <Leaderboard />
        </div>
      </div>
      <AdminPanel />
    </main>
  );
}
