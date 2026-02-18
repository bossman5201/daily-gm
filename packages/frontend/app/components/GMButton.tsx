'use client';

import * as React from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useReadContract, type BaseError } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';

import { playSound } from '../../lib/audio';
import { Button } from '@/components/ui/button';
import { Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { motion, useAnimation } from "framer-motion";

// Replace with deployed contract address
const CONTRACT_ADDRESS = "0xc807c3B44E801C38bb3460E35FCC67BA3B472D55";
const GM_ABI = [
    {
        inputs: [],
        name: "gm",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "lastGMTime",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    }
] as const;

export function GMButton() {
    const { address, isConnected } = useAccount();
    const { sendTransaction, data: hash, isPending, error } = useSendTransaction();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const controls = useAnimation();

    // Read the last GM time for this user
    const { data: lastGMTime, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: GM_ABI,
        functionName: 'lastGMTime',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address,
        }
    });

    const [timeLeft, setTimeLeft] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!lastGMTime) {
            setTimeLeft(null);
            return;
        }

        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const lastTime = Number(lastGMTime);

            // If lastTime is 0, they haven't GM'd yet
            if (lastTime === 0) {
                setTimeLeft(null);
                return;
            }

            const nextGM = lastTime + (24 * 60 * 60);
            const diff = nextGM - now;

            if (diff <= 0) {
                setTimeLeft(null);
            } else {
                const h = Math.floor(diff / 3600);
                const m = Math.floor((diff % 3600) / 60);
                const s = diff % 60;
                setTimeLeft(`${h}h ${m}m ${s}s`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [lastGMTime]);

    React.useEffect(() => {
        if (isSuccess) {
            refetch(); // Update lastGMTime immediately after success
            import('canvas-confetti').then((confetti) => {
                confetti.default({
                    particleCount: 150,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#0052FF', '#FFFFFF', '#000000'] // Base Brand Colors
                });
            });
            playSound('success');
            // Toast removed as requested (using native UI state or OnchainKit lifecycle)
        }
        if (error) {
            playSound('error');
            // Toast removed
        }
    }, [isSuccess, error]);

    const handleGM = () => {
        playSound('click');
        // 1. Encode the function call (gm())
        const data = encodeFunctionData({
            abi: GM_ABI,
            functionName: 'gm'
        });

        // 2. Send the transaction (Builder Code auto-appended via wagmi dataSuffix)
        sendTransaction({
            to: CONTRACT_ADDRESS,
            value: parseEther('0.000025'),
            data: data
        });
    };

    const handleWrapperClick = () => {
        if (!isConnected || isPending || isConfirming || !!timeLeft) {
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.4 }
            });
            playSound('error');
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <motion.div
                animate={controls}
                onClick={handleWrapperClick}
                className="rounded-full" // Wrapper to capture clicks even when button is disabled
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Just in case, though button disabled usually stops clicks.
                        // However, if disabled, the click might pass through to the wrapper anyway.
                        // If enabled, we want the button click to handle properly.
                        handleGM();
                    }}
                    disabled={!isConnected || isPending || isConfirming || !!timeLeft}
                    className="group relative flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br from-[#0052FF] to-[#0035A0] text-7xl font-black text-white transition-all duration-200 hover:scale-105 hover:shadow-[0_0_80px_-10px_#0052FF] active:scale-95 shadow-[0_0_40px_-10px_rgba(0,82,255,0.4)] ring-4 ring-white/5 backdrop-blur-sm disabled:opacity-80 disabled:cursor-not-allowed disabled:pointer-events-none"
                >
                    {isPending || isConfirming ? (
                        <Loader2 className="h-24 w-24 animate-spin text-white/50" />
                    ) : timeLeft ? (
                        <div className="flex flex-col items-center gap-2 animate-pulse">
                            <Timer className="h-10 w-10 text-white/70" />
                            <span className="text-xl font-mono tracking-widest">{timeLeft}</span>
                        </div>
                    ) : (
                        "GM"
                    )}
                </button>
            </motion.div>

            {hash && <div className="text-xs text-gray-500">Tx: {hash.slice(0, 6)}...{hash.slice(-4)}</div>}
            {isSuccess && <div className="text-green-500 font-bold">GM Sent! Streak Updated!</div>}
            {error && (
                <div className="text-red-500 text-sm max-w-[300px] text-center">
                    Error: {(error as BaseError).shortMessage || error.message}
                </div>
            )}
        </div>
    );
}
