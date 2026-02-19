'use client';

import * as React from 'react';
import { usePublicClient } from 'wagmi';
import { base } from 'wagmi/chains';
import { type Log } from 'viem';
import { Trophy } from 'lucide-react';
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';

interface LeaderboardEntry {
    user: string;
    streak: number;
    lastGM: string;
}

export function Leaderboard() {
    const publicClient = usePublicClient({ chainId: base.id });
    const [leaders, setLeaders] = React.useState<LeaderboardEntry[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        if (!publicClient) return;

        const fetchLeaderboard = async () => {
            try {
                const blockNumber = await publicClient.getBlockNumber();

                // We want to look back ~24 hours + buffer (approx 45,000 blocks on Base)
                // We fetch in chunks of 9,900 to be safe with RPC limits
                const CHUNK_SIZE = 9900n;
                const TOTAL_BLOCKS_TO_FETCH = 45000n;

                const chunks = [];
                let currentToBlock = blockNumber;
                let blocksFetched = 0n;

                while (blocksFetched < TOTAL_BLOCKS_TO_FETCH) {
                    const fromBlock = currentToBlock - CHUNK_SIZE > 0n ? currentToBlock - CHUNK_SIZE : 0n;

                    chunks.push(
                        publicClient.getContractEvents({
                            address: CONTRACT_ADDRESS,
                            abi: DAILY_GM_ABI,
                            eventName: 'GM',
                            fromBlock: fromBlock,
                            toBlock: currentToBlock
                        })
                    );

                    blocksFetched += (currentToBlock - fromBlock);
                    currentToBlock = fromBlock - 1n; // Move cursor

                    if (fromBlock === 0n) break; // Reached genesis
                }

                // Execute all fetches in parallel
                const results = await Promise.all(chunks);
                const logs = results.flat();

                // Aggregate by user, taking highest streak
                const userMap = new Map<string, { streak: number, timestamp: bigint }>();

                logs.forEach((log) => {
                    const { args } = log as Log & { args: { user: string; streak: bigint; timestamp: bigint } };
                    const current = userMap.get(args.user);

                    // If we haven't seen this user or this log has a higher streak/later time
                    // (Actually we just want their *latest* state)
                    if (!current || args.streak > BigInt(current.streak)) {
                        userMap.set(args.user, {
                            streak: Number(args.streak),
                            timestamp: args.timestamp
                        });
                    }
                });

                // Convert to array and sort
                const sortedLeaders = Array.from(userMap.entries())
                    .map(([user, data]) => ({
                        user,
                        streak: data.streak,
                        lastGM: new Date(Number(data.timestamp) * 1000).toLocaleTimeString()
                    }))
                    .sort((a, b) => b.streak - a.streak)
                    .slice(0, 10); // Top 10

                setLeaders(sortedLeaders);
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLeaderboard();
        // Refresh every minute
        const interval = setInterval(fetchLeaderboard, 60000);
        return () => clearInterval(interval);
    }, [publicClient]);

    return (
        <div className="w-full max-w-md mt-8">
            <div className="flex items-center gap-2 mb-4 justify-center">
                <Trophy className="w-4 h-4 text-[#0052FF]" />
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Top Active Streaks</h3>
            </div>

            {/* Premium Gradient Border Wrapper */}
            <div className="relative p-[1px] rounded-2xl bg-gradient-to-b from-[#0052FF]/30 via-transparent to-transparent">
                <div className="glass-card rounded-2xl overflow-hidden p-2 bg-black/80 backdrop-blur-xl">
                    {isLoading ? (
                        <div className="space-y-3 p-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex justify-between items-center p-4 rounded-xl bg-white/5 animate-pulse">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/10"></div>
                                        <div className="h-4 w-24 bg-white/10 rounded"></div>
                                    </div>
                                    <div className="h-8 w-12 bg-white/10 rounded"></div>
                                </div>
                            ))}
                        </div>
                    ) : leaders.length === 0 ? (
                        <div className="p-8 text-center text-white/30 text-xs">
                            No active streaks found recently.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {leaders.map((leader, i) => (
                                <div key={leader.user} className="flex justify-between items-center p-4 rounded-xl hover:bg-white/5 transition-all duration-300 group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-black shadow-lg ${i === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 text-black' :
                                            i === 1 ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900' :
                                                i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white' :
                                                    'bg-white/5 text-white/40'
                                            }`}>
                                            {i + 1}
                                        </div>
                                        <span className="font-mono text-sm text-white/70 group-hover:text-white transition-colors">
                                            {leader.user.slice(0, 6)}...{leader.user.slice(-4)}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[#0052FF] font-black text-xl leading-none text-neon">{leader.streak}</span>
                                        <span className="text-[10px] text-white/30 font-medium uppercase tracking-widest">Streak</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
