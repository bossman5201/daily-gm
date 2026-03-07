'use client';

import * as React from 'react';
import { useAccount, useReadContracts, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSwitchChain } from 'wagmi';
import { base } from 'wagmi/chains';
import { User, Flame, Hash, Shield } from 'lucide-react';
import { parseEther, formatEther } from 'viem';
import { toast } from 'sonner';
import { motion, useSpring, useTransform } from "framer-motion";
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';
import { parseError } from '../../lib/error';
import { getRank } from '../../lib/ranks';
import { getAchievements } from '../../lib/achievements';
import { useGMContext } from '../context/GMContext';

function NumberTicker({ value }: { value: number }) {
    const spring = useSpring(0, { bounce: 0, duration: 2000 });
    const display = useTransform(spring, (current) => Math.floor(current));

    React.useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
}

export function PersonalStats() {
    const { address, isConnected, chainId } = useAccount();
    const { switchChain } = useSwitchChain();
    const [isMounted, setIsMounted] = React.useState(false);
    const { optimisticGM } = useGMContext();

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const { data: stats, refetch } = useReadContracts({
        contracts: [
            {
                address: CONTRACT_ADDRESS,
                abi: DAILY_GM_ABI,
                functionName: 'userStats',
                args: [address as `0x${string}`],
            }
        ],
        query: {
            enabled: !!address,
        }
    });

    // Read restore fee from contract
    const { data: restoreFee, isLoading: isFeeLoading } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'restoreFee',
    });

    const { writeContract, data: hash, isPending: isWritePending } = useWriteContract({
        mutation: {
            onSuccess: () => {
                toast.dismiss();
                toast.success("Restore tx sent! Waiting...");
            },
            onError: (error) => {
                const cleanMessage = parseError(error);
                toast.dismiss();
                toast.error(cleanMessage);
            }
        }
    });

    const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
        hash,
    });

    React.useEffect(() => {
        if (isConfirmed) {
            refetch();
            toast.dismiss();
            toast.success('Streak Restored! 🛡️', {
                description: 'Your streak has been saved.',
            });
        }
    }, [isConfirmed, refetch]);


    const handleRestore = () => {
        if (!restoreFee) return;

        if (chainId !== base.id) {
            switchChain({ chainId: base.id });
            return;
        }

        writeContract({
            address: CONTRACT_ADDRESS,
            abi: DAILY_GM_ABI,
            functionName: 'restoreStreak',
            value: restoreFee,
        });
    };

    if (!isMounted || !isConnected || !address) return null;

    const userStatsData = stats?.[0]?.result as [number, number, number, number, number] | undefined;
    const hasOptimistic = !!optimisticGM;

    // The tuple returns [lastGMTime, currentStreak, totalGMs, longestStreak, brokenStreak]
    const totalGMs = userStatsData ? Number(userStatsData[2]) + (hasOptimistic ? 1 : 0) : (hasOptimistic ? 1 : null);
    const currentStreak = userStatsData ? Number(userStatsData[1]) + (hasOptimistic ? 1 : 0) : (hasOptimistic ? 1 : 0);
    const longestStreak = userStatsData ? Math.max(Number(userStatsData[3]), currentStreak) : (hasOptimistic ? 1 : null);
    const brokenStreak = userStatsData ? Number(userStatsData[4]) : 0;
    const rank = getRank(currentStreak);
    const achievements = getAchievements({
        totalGMs: totalGMs ?? 0,
        longestStreak: longestStreak ?? 0,
        currentStreak,
        brokenStreak,
    });

    const isPending = isWritePending || isConfirming;

    return (
        <div className="relative w-full max-w-md mt-12 flex flex-col gap-6 animate-in fade-in zoom-in duration-500 delay-150 overflow-hidden p-4">
            {/* The Glow Blob */}
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse pointer-events-none"></div>
            <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse delay-700 pointer-events-none"></div>

            {/* Stats Card */}
            <div className="relative p-8 glass-card rounded-3xl group transition-all duration-300 hover:scale-[1.02] border border-white/5 z-10">
                <div className="flex items-center gap-2 mb-6 justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <User className="w-4 h-4 text-[#0052FF]" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Your Stats</h3>
                </div>

                {rank && (
                    <div className="flex items-center justify-center gap-2 mb-6 py-2 px-4 rounded-full bg-white/5 border border-white/10 w-fit mx-auto">
                        <span className="text-lg">{rank.badge}</span>
                        <span className="text-xs font-bold uppercase tracking-widest text-white/60">{rank.name}</span>
                    </div>
                )}

                {/* Achievement Badges */}
                <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
                    {achievements.map((a) => (
                        <div
                            key={a.id}
                            title={a.unlocked ? `${a.name}: ${a.description}` : `🔒 ${a.name}: ${a.description}`}
                            className={`text-2xl transition-all duration-300 cursor-default ${a.unlocked ? 'opacity-100 scale-100' : 'opacity-20 grayscale scale-90'
                                }`}
                        >
                            {a.badge}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-8 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-12 bg-white/10"></div>

                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Total GMs</span>
                        {totalGMs !== null ? (
                            <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                <NumberTicker value={totalGMs} />
                            </span>
                        ) : (
                            <div className="h-10 w-24 bg-white/10 rounded animate-pulse" />
                        )}
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Longest Streak</span>
                        <div className="flex items-center gap-2">
                            {longestStreak !== null ? (
                                <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-br from-[#0052FF] to-cyan-400 drop-shadow-[0_0_15px_rgba(0,82,255,0.4)]">
                                    <NumberTicker value={longestStreak} />
                                </span>
                            ) : (
                                <div className="h-10 w-24 bg-white/10 rounded animate-pulse" />
                            )}
                            <Flame className="w-6 h-6 text-[#0052FF] animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Shield / Restore Section */}
            {brokenStreak > 0 && (
                <div className="relative z-10 p-4 bg-red-500/10 rounded-xl border border-red-500/20 flex flex-col items-center text-center">
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="w-5 h-5 text-red-500" />
                        <h3 className="text-md font-bold text-red-100">Streak Broken!</h3>
                    </div>
                    <p className="text-sm text-red-200/70 mb-4">
                        You lost a streak of <span className="font-bold text-white">{brokenStreak} days</span>.
                        <br />
                        Restore it now for {restoreFee ? formatEther(restoreFee) : '...'} ETH?
                    </p>
                    <button
                        onClick={handleRestore}
                        disabled={isPending || isFeeLoading || !restoreFee}
                        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPending ? (
                            <>Restoring...</>
                        ) : isFeeLoading ? (
                            <>Loading Fee...</>
                        ) : (
                            <>Restore Streak ({restoreFee ? formatEther(restoreFee) : ''} ETH)</>
                        )}
                    </button>
                    {isConfirmed && <p className="text-xs text-green-400 mt-2">Streak Restored!</p>}
                </div>
            )}

            <p className="text-[10px] text-white/30 text-center mt-2 w-full">Data syncs every ~60 seconds</p>
        </div>
    );
}
