'use client';

import * as React from 'react';
import { useWatchContractEvent, usePublicClient } from 'wagmi';
import { base } from 'wagmi/chains';
import { type Log } from 'viem';
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';

interface GMEvent {
    user: string;
    streak: number;
    timestamp: string;
    txHash: string;
}

export function LiveFeed() {
    const [events, setEvents] = React.useState<GMEvent[]>([]);
    const publicClient = usePublicClient({ chainId: base.id });

    // Initial fetch of logs
    React.useEffect(() => {
        if (!publicClient) return;

        const fetchLogs = async () => {
            try {
                const blockNumber = await publicClient.getBlockNumber();
                // Fetch last 5000 blocks (approx 2.5 hours on Base) to stay within RPC limits (usually 10k)
                const fromBlock = blockNumber - 5000n > 0n ? blockNumber - 5000n : 0n;

                const logs = await publicClient.getContractEvents({
                    address: CONTRACT_ADDRESS,
                    abi: DAILY_GM_ABI,
                    eventName: 'GM',
                    fromBlock: fromBlock
                });

                // Sort by block number descending (newest first)
                const sortedLogs = logs.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

                const formattedEvents = sortedLogs.slice(0, 50).map((log) => {
                    const { args, transactionHash } = log as Log & { args: { user: string; streak: bigint; timestamp: bigint } };
                    return {
                        user: args.user,
                        streak: Number(args.streak),
                        timestamp: new Date(Number(args.timestamp) * 1000).toLocaleTimeString(),
                        txHash: transactionHash || '',
                    };
                });
                setEvents(formattedEvents);
            } catch (error) {
                console.error("Failed to fetch logs:", error);
            }
        };

        fetchLogs();
    }, [publicClient]);

    useWatchContractEvent({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        eventName: 'GM',
        chainId: base.id,
        onLogs(logs) {
            const newEvents = logs.map((log) => {
                const { args, transactionHash } = log as Log & { args: { user: string; streak: bigint; timestamp: bigint } };
                return {
                    user: args.user,
                    streak: Number(args.streak),
                    timestamp: new Date(Number(args.timestamp) * 1000).toLocaleTimeString(),
                    txHash: transactionHash || '',
                };
            });
            // Update state, avoiding duplicates based on txHash
            setEvents((prev) => {
                const uniqueNewEvents = newEvents.filter(
                    (newE) => !prev.some((prevE) => prevE.txHash === newE.txHash)
                );
                return [...uniqueNewEvents, ...prev].slice(0, 50);
            });
        },
    });

    return (
        <div className="w-full max-w-md mt-8">
            <div className="flex items-center gap-2 mb-4 justify-center">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider">Live GMs</h3>
            </div>

            <div className="glass-card rounded-2xl p-2 h-80 overflow-y-auto scrollbar-hide space-y-1">
                {events.length === 0 ? (
                    <div className="text-center text-white/30 text-sm py-8">
                        {publicClient ? "Loading GMs..." : "Connect wallet to view GMs"}
                    </div>
                ) : (
                    events.map((event, i) => (
                        <div key={`${event.txHash}-${i}`} className="flex justify-between items-center text-sm p-4 bg-black/20 rounded-xl border border-white/5 hover:border-white/20 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,82,255,0.1)] animate-in slide-in-from-bottom-2">
                            <div className="flex flex-col gap-1">
                                <span className="text-[#0052FF] font-mono font-bold tracking-tight">
                                    {event.user.slice(0, 6)}...{event.user.slice(-4)}
                                </span>
                                <span className="text-[10px] text-white/40 font-medium uppercase tracking-wider">{event.timestamp}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                <span className="text-white font-bold text-xs">Streak: {event.streak} 🔥</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
