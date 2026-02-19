'use client';

import * as React from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LeaderboardEntry {
    address: string;
    current_streak: number;
    last_gm: string;
    // We can add more fields if needed
}

export function Leaderboard() {
    const [leaders, setLeaders] = React.useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    const fetchLeaderboard = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('address, current_streak, last_gm')
                .order('current_streak', { ascending: false })
                .limit(10);

            if (error) throw error;

            if (data) {
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

        // Real-time subscription to 'users' table updates
        const channel = supabase
            .channel('leaderboard_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to INSERT and UPDATE
                    schema: 'public',
                    table: 'users',
                },
                () => {
                    // When any user updates, refresh the top 10
                    // Optimization: We could just update state if the changed user is in top 10,
                    // but re-fetching top 10 is cheap and safe.
                    fetchLeaderboard();
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
                <Trophy className="w-4 h-4 text-[#0052FF]" />
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Top Active Streaks</h3>
            </div>

            {/* Premium Gradient Border Wrapper */}
            <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-[#0052FF]/30 via-transparent to-transparent">
                <div className="glass-card rounded-2xl overflow-hidden p-2 bg-black/80 backdrop-blur-xl min-h-[400px]">
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(10)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 animate-pulse">
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
                                            <div className="flex flex-col">
                                                <span className="font-mono text-sm text-white/70 group-hover:text-white transition-colors">
                                                    {leader.address.slice(0, 6)}...{leader.address.slice(-4)}
                                                </span>
                                                {isTop3 && <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">Leader</span>}
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
        </div>
    );
}
