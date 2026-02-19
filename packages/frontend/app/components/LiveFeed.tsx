'use client';

import * as React from 'react';
import { supabase } from '../../lib/supabase';

interface GMEvent {
    user_address: string;
    streak: number;
    block_timestamp: number;
    tx_hash: string;
}

export function LiveFeed() {
    const [events, setEvents] = React.useState<GMEvent[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchLogs = async () => {
        try {
            const { data, error } = await supabase
                .from('gm_events')
                .select('*')
                .order('block_timestamp', { ascending: false })
                .limit(50);

            if (error) throw error;
            if (data) setEvents(data);
        } catch (error) {
            console.error("Failed to fetch logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchLogs();

        // Real-time subscription to 'gm_events' table updates (INSERTs)
        const channel = supabase
            .channel('live_feed_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'gm_events',
                },
                (payload) => {
                    const newEvent = payload.new as GMEvent;
                    setEvents((prev) => [newEvent, ...prev].slice(0, 50));
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    return (
        <div className="w-full max-w-md mt-8">
            <div className="flex items-center gap-2 mb-4 justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Live GMs</h3>
            </div>

            <div className="glass-card rounded-2xl p-2 h-80 overflow-y-auto scrollbar-hide space-y-1 bg-black/40 backdrop-blur-md">
                {isLoading && events.length === 0 ? (
                    <div className="space-y-2">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 animate-pulse">
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
                ) : (
                    events.map((event, i) => (
                        <div key={`${event.tx_hash}-${i}`} className="flex justify-between items-center text-sm p-3 bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300 hover:bg-white/10 animate-in slide-in-from-top-2 fade-in duration-500">
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[#0052FF] font-mono font-bold tracking-tight text-xs">
                                    {event.user_address.slice(0, 6)}...{event.user_address.slice(-4)}
                                </span>
                                <span className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                                    {new Date(event.block_timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                                <span className="text-white font-bold text-[10px] tracking-wide">Streak: <span className="text-[#0052FF]">{event.streak}</span></span>
                                <span className="text-xs">🔥</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
