'use client';

import * as React from 'react';
import { useAccount } from 'wagmi';
import { useGMContext } from '../context/GMContext';

interface GMEvent {
    user_address: string;
    streak: number;
    block_timestamp: number;
    tx_hash: string;
    farcaster_username?: string;
    farcaster_pfp_url?: string;
}

export function LiveFeed() {
    const { address } = useAccount();
    const [events, setEvents] = React.useState<GMEvent[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isMounted, setIsMounted] = React.useState(false);
    const [isError, setIsError] = React.useState(false);
    const { optimisticGM } = useGMContext();

    const fetchLogs = async () => {
        try {
            setIsError(false);
            const res = await fetch(`/api/stats?type=live-gms&t=${Date.now()}`, { cache: 'no-store' });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            setEvents(data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        setIsMounted(true);
        fetchLogs();

        // Since we removed Supabase, we fall back to short-polling 
        // every 15 seconds to simulate a live feed.
        const interval = setInterval(fetchLogs, 15000);

        const handleOptimisticUpdate = () => {
            // Staggered refetches: first try after DB write, second as safety net
            setTimeout(fetchLogs, 1000);
            setTimeout(fetchLogs, 3000);
        };
        window.addEventListener('optimistic-update', handleOptimisticUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('optimistic-update', handleOptimisticUpdate);
        };
    }, []);

    if (!isMounted) return null; // Prevent hydration mismatch by returning null on server

    return (
        <div className="w-full max-w-md mt-8">
            <div className="flex items-center gap-2 mb-4 justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Live GMs</h3>
            </div>

            <div className="glass-card rounded-2xl p-2 h-80 overflow-y-auto scrollbar-hide space-y-1 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]">
                {isError ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-red-400 space-y-2">
                        <div className="w-2 h-2 rounded-full bg-red-500/50 animate-ping" />
                        <span className="text-xs font-bold">System Offline</span>
                        <span className="text-[10px] opacity-70">Check connection or API keys</span>
                    </div>
                ) : isLoading && events.length === 0 ? (
                    <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="relative flex justify-between items-center p-3 rounded-xl bg-white/5 overflow-hidden">
                                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                <div className="flex flex-col gap-2">
                                    <div className="h-3 w-24 bg-white/10 rounded"></div>
                                    <div className="h-2 w-16 bg-white/5 rounded"></div>
                                </div>
                                <div className="h-6 w-16 bg-white/10 rounded-full"></div>
                            </div>
                        ))}
                    </div>
                ) : events.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-white/30 space-y-2">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <span className="text-xs">Waiting for the first GM...</span>
                    </div>
                ) : (() => {
                    // Merge optimistic entry at the top if available and not already in the list
                    const displayEvents = optimisticGM && !events.some(e => e.tx_hash === optimisticGM.txHash)
                        ? [{
                            user_address: optimisticGM.address,
                            tx_hash: optimisticGM.txHash || `optimistic-${optimisticGM.timestamp}`,
                            streak: 0, // Will be corrected by server
                            block_timestamp: optimisticGM.timestamp,
                            farcaster_username: null,
                            farcaster_pfp_url: null,
                        }, ...events]
                        : events;

                    return displayEvents.map((event) => {
                        const isYou = address && event.user_address.toLowerCase() === address.toLowerCase();
                        return (
                            <div key={event.tx_hash} className={`flex justify-between items-center text-sm p-3 rounded-xl border transition-all duration-300 animate-in slide-in-from-right-8 fade-in duration-500 ${isYou
                                ? 'bg-[#0052FF]/10 border-[#0052FF]/30 shadow-[0_0_20px_-5px_rgba(0,82,255,0.3)]'
                                : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10'
                                }`}>
                                <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-2">
                                        {event.farcaster_pfp_url ? (
                                            <img src={event.farcaster_pfp_url} alt="PFP" className="w-5 h-5 rounded-full object-cover border border-white/10" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[7px] text-white/50">
                                                {event.user_address.slice(2, 4)}
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5">
                                            <span className={`font-mono font-bold tracking-tight text-xs ${isYou ? 'text-white' : 'text-[#0052FF]'}`}>
                                                {isYou ? 'YOU' : (event.farcaster_username ? `@${event.farcaster_username}` : `${event.user_address.slice(0, 6)}...${event.user_address.slice(-4)}`)}
                                            </span>
                                            {isYou && <span className="text-[8px] bg-[#0052FF] text-white px-1.5 py-0.5 rounded-full font-bold">GM!</span>}
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                                        {new Date(event.block_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                    <span className="text-white font-bold text-[10px] tracking-wide">Streak: <span className="text-[#0052FF]">{event.streak}</span></span>
                                    <span className="text-xs">🔥</span>
                                </div>
                            </div>
                        );
                    })
                })()}
            </div>
        </div >
    );
}
