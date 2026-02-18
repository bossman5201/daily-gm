'use client';

import * as React from 'react';
import { useAccount, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { User, Flame, Hash, Shield } from 'lucide-react';
import { parseEther } from 'viem';
import { toast } from 'sonner';
import { motion, useSpring, useTransform } from "framer-motion";

// Replace with deployed contract address
const CONTRACT_ADDRESS = "0xc807c3B44E801C38bb3460E35FCC67BA3B472D55";

const STATS_ABI = [
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "totalGMs",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "longestStreak",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "brokenStreak",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "restoreStreak",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    }
] as const;

function NumberTicker({ value }: { value: number }) {
    const spring = useSpring(0, { bounce: 0, duration: 2000 });
    const display = useTransform(spring, (current) => Math.floor(current));

    React.useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
}

export function PersonalStats() {
    const { address, isConnected } = useAccount();
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const { data: stats, refetch } = useReadContracts({
        contracts: [
            {
                address: CONTRACT_ADDRESS,
                abi: STATS_ABI,
                functionName: 'totalGMs',
                args: [address as `0x${string}`],
            },
            {
                address: CONTRACT_ADDRESS,
                abi: STATS_ABI,
                functionName: 'longestStreak',
                args: [address as `0x${string}`],
            },
            {
                address: CONTRACT_ADDRESS,
                abi: STATS_ABI,
                functionName: 'brokenStreak',
                args: [address as `0x${string}`],
            },
        ],
        query: {
            enabled: !!address,
        }
    });

    const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
        hash,
    });

    React.useEffect(() => {
        if (isConfirmed) {
            refetch();
            toast.success('Streak Restored! 🛡️', {
                description: 'Your streak has been saved.',
            });
        }
        if (writeError) {
            toast.error('Restore Failed', {
                description: writeError.message.split('\n')[0],
            });
        }
    }, [isConfirmed, refetch, writeError]);

    const handleRestore = () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: STATS_ABI,
            functionName: 'restoreStreak',
            value: parseEther('0.0005'),
        });
    };

    if (!isMounted || !isConnected || !address) return null;

    const totalGMs = stats?.[0]?.result ? Number(stats[0].result) : null;
    const longestStreak = stats?.[1]?.result ? Number(stats[1].result) : null;
    const brokenStreak = stats?.[2]?.result ? Number(stats[2].result) : 0;

    const isPending = isWritePending || isConfirming;

    return (
        <div className="relative w-full max-w-md mt-12 flex flex-col gap-6 animate-in fade-in zoom-in duration-500 delay-150">
            {/* The Glow Blob */}
            <div className="absolute -top-10 -left-10 w-72 h-72 bg-blue-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse pointer-events-none"></div>
            <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse delay-700 pointer-events-none"></div>

            {/* Stats Card */}
            <div className="relative p-8 glass-card rounded-3xl group transition-all duration-300 hover:scale-[1.02] border border-white/5 z-10">
                <div className="flex items-center gap-2 mb-6 justify-center opacity-60 group-hover:opacity-100 transition-opacity">
                    <User className="w-4 h-4 text-[#0052FF]" />
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em]">Your Stats</h3>
                </div>

                <div className="grid grid-cols-2 gap-8 relative">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-12 bg-white/10"></div>

                    <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Total GMs</span>
                        {totalGMs !== null ? (
                            <span className="text-4xl font-black text-white text-neon-white">
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
                                <span className="text-4xl font-black text-[#0052FF] text-neon">
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
                        <h3 className="text-md font-bold text-red-100">Streak Broker!</h3>
                    </div>
                    <p className="text-sm text-red-200/70 mb-4">
                        You lost a streak of <span className="font-bold text-white">{brokenStreak} days</span>.
                        <br />
                        Restore it now for 0.0005 ETH?
                    </p>
                    <button
                        onClick={handleRestore}
                        disabled={isPending}
                        className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isPending ? (
                            <>Restoring...</>
                        ) : (
                            <>Restore Streak (0.0005 ETH)</>
                        )}
                    </button>
                    {isConfirmed && <p className="text-xs text-green-400 mt-2">Streak Restored!</p>}
                </div>
            )}
        </div>
    );
}
