'use client';

import * as React from 'react';
import { Trophy } from 'lucide-react';
import { getRank } from '../../lib/ranks';

interface LeaderboardEntry {
    address: string;
    current_streak: number;
    last_gm: string;
    farcaster_username?: string;
    farcaster_pfp_url?: string;
}

export function Leaderboard() {
    const [leaders, setLeaders] = React.useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchLeaderboard = async () => {
        try {
            const res = await fetch(`/api/stats?type=leaderboard&t=${Date.now()}`, { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setLeaders(data);
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        fetchLeaderboard();

        // Fall back to polling since Supabase WebSockets are gone
        const interval = setInterval(fetchLeaderboard, 30000);

        const handleOptimisticUpdate = () => {
            // Wait briefly for optimistic DB write to complete
            setTimeout(fetchLeaderboard, 500);
        };
        window.addEventListener('optimistic-update', handleOptimisticUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('optimistic-update', handleOptimisticUpdate);
        };
    }, []);

    return (
        <div className="w-full max-w-md mt-8">
            <div className="flex items-center gap-2 mb-4 justify-center">
                <Trophy className="w-4 h-4 text-[#0052FF]" />
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Top Active Streaks</h3>
            </div>

            {/* Premium Gradient Border Wrapper */}
            <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-[#0052FF]/30 via-transparent to-transparent">
                <div className="glass-card rounded-2xl overflow-hidden p-2 bg-black/40 backdrop-blur-2xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] min-h-[400px]">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="relative flex justify-between items-center p-3 rounded-xl bg-white/5 overflow-hidden">
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white/10"></div>
                                        <div className="h-4 w-20 bg-white/10 rounded"></div>
                                    </div>
                                    <div className="h-4 w-8 bg-white/10 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : leaders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-center text-white/30 space-y-2">
                            <Trophy className="w-8 h-8 opacity-20" />
                            <span className="text-xs">No active streaks yet.</span>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {leaders.map((leader, i) => {
                                const isTop3 = i < 3;
                                const rankColor = i === 0 ? 'text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]' :
                                    i === 1 ? 'text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.5)]' :
                                        i === 2 ? 'text-amber-600 drop-shadow-[0_0_10px_rgba(217,119,6,0.5)]' : 'text-white/40';

                                return (
                                    <div key={leader.address} className="flex justify-between items-center p-3 rounded-xl hover:bg-white/5 transition-all duration-300 group">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-6 text-center font-black ${rankColor} text-lg`}>
                                                {i + 1}
                                            </div>
                                            {leader.farcaster_pfp_url ? (
                                                <img src={leader.farcaster_pfp_url} alt="Avatar" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-black/40 border border-white/10 flex items-center justify-center text-[10px] text-white/50">
                                                    {leader.address.slice(2, 4)}
                                                </div>
                                            )}
                                            <div className="flex flex-col">
                                                <span className="font-mono text-sm text-white/70 group-hover:text-white transition-colors">
                                                    {leader.farcaster_username ? `@${leader.farcaster_username}` : `${leader.address.slice(0, 6)}...${leader.address.slice(-4)}`}
                                                </span>
                                                {(() => { const r = getRank(leader.current_streak); return r ? <span className="text-[9px] text-white/30 uppercase tracking-widest font-bold">{r.badge} {r.name}</span> : null; })()}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className="text-[#0052FF] font-black text-lg leading-none text-neon">{leader.current_streak}</span>
                                            <span className="text-[9px] text-white/30 font-medium uppercase tracking-wider">Streak</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            <p className="text-[10px] text-white/30 text-center mt-3">Rankings update every ~60 seconds</p>
        </div>
    );
}
