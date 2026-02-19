'use client';

import * as React from 'react';
import { useAccount, useSendTransaction, useWaitForTransactionReceipt, useReadContract, useSwitchChain, type BaseError } from 'wagmi';
import { parseEther, encodeFunctionData } from 'viem';
import { base } from 'wagmi/chains';

import { playSound } from '../../lib/audio';
import { Button } from '@/components/ui/button';
import { Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { motion, useAnimation } from "framer-motion";
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';
import { parseError } from '../../lib/error';

export function GMButton() {
    const { address, isConnected, chainId } = useAccount();
    const { sendTransaction, data: hash, isPending, error } = useSendTransaction({
        mutation: {
            onSuccess: () => {
                toast.success("Transaction sent! Waiting for confirmation...");
            },
            onError: (error) => {
                const cleanMessage = parseError(error);
                toast.error(cleanMessage);
                playSound('error');
            }
        }
    });

    const { switchChain } = useSwitchChain();
    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const controls = useAnimation();

    // Read the protocol fee from contract
    const { data: protocolFee } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'protocolFee',
    });

    // Read the last GM time for this user
    const { data: lastGMTime, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
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

            const nextGM = lastTime + (20 * 60 * 60); // Match contract's 20h cooldown
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
        }
    }, [isSuccess, refetch]);

    const isWrongChain = isConnected && chainId !== base.id;

    const handleGM = () => {
        if (isWrongChain) {
            switchChain({ chainId: base.id });
            return;
        }
        playSound('click');
        // 1. Encode the function call (gm())
        const data = encodeFunctionData({
            abi: DAILY_GM_ABI,
            functionName: 'gm'
        });

        // 2. Send the transaction
        sendTransaction({
            to: CONTRACT_ADDRESS,
            value: protocolFee ?? parseEther('0.000025'),
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
                    {isPending ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-16 w-16 animate-spin text-white/50" />
                            <span className="text-lg font-bold text-white/60">Signing...</span>
                        </div>
                    ) : isConfirming ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-16 w-16 animate-spin text-white/50" />
                            <span className="text-lg font-bold text-white/60">Confirming...</span>
                        </div>
                    ) : timeLeft ? (
                        <div className="flex flex-col items-center gap-2 animate-pulse">
                            <Timer className="h-10 w-10 text-white/70" />
                            <span className="text-xl font-mono tracking-widest">{timeLeft}</span>
                        </div>
                    ) : isWrongChain ? (
                        <span className="text-2xl">Switch to Base</span>
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
