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
                toast.dismiss();
                toast.success("Transaction sent! Waiting for confirmation...");
            },
            onError: (error) => {
                const cleanMessage = parseError(error);
                toast.dismiss();
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
    const { data: userStats, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'userStats',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address,
        }
    });

    const lastGMTime = userStats ? (userStats as [bigint | number, unknown, unknown, unknown, unknown])[0] : null;

    const [timeLeft, setTimeLeft] = React.useState<string | null>(null);
    const [isLapsed, setIsLapsed] = React.useState(false);
    const [txTimeout, setTxTimeout] = React.useState(false);

    React.useEffect(() => {
        let timeoutId: NodeJS.Timeout;
        if (isConfirming) {
            timeoutId = setTimeout(() => {
                setTxTimeout(true);
            }, 60000); // 60 seconds timeout
        } else {
            setTxTimeout(false);
        }
        return () => clearTimeout(timeoutId);
    }, [isConfirming]);

    React.useEffect(() => {
        if (!lastGMTime) {
            setTimeLeft(null);
            setIsLapsed(false);
            return;
        }

        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const lastTime = Number(lastGMTime);

            // If lastTime is 0, they haven't GM'd yet
            if (lastTime === 0) {
                setTimeLeft(null);
                setIsLapsed(false);
                return;
            }

            const nextGM = lastTime + (20 * 60 * 60); // Match contract's 20h cooldown
            const diff = nextGM - now;

            // Check if streak is lapsed (>48h and <9 days)
            const timeSinceLastGM = now - lastTime;
            const hasLapsed = timeSinceLastGM > (48 * 60 * 60) && timeSinceLastGM <= ((48 + 7 * 24) * 60 * 60);
            setIsLapsed(hasLapsed);

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
        if (!isConnected) {
            toast.dismiss();
            toast.error("Please connect your wallet first! 👛");
            // Still play error/shake for feedback
        }

        if (!isConnected || isPending || (isConfirming && !txTimeout) || !!timeLeft) {
            controls.start({
                x: [0, -10, 10, -10, 10, 0],
                transition: { duration: 0.4 }
            });
            playSound('error');
        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {isLapsed && !isSuccess && (
                <div className="absolute top-1/2 -translate-y-48 z-20 text-center text-xs sm:text-sm font-semibold text-orange-400 bg-orange-400/10 border border-orange-400/20 px-6 py-3 rounded-full shadow-[0_0_30px_-5px_orange] w-max max-w-[90vw] pointer-events-none">
                    ⚠️ Streak lapsed! GM now to unlock Restore.
                </div>
            )}
            <motion.div
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        handleWrapperClick();
                    }
                }}
                animate={controls}
                onClick={handleWrapperClick}
                className="rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#0052FF]/50" // Wrapper to capture clicks even when button is disabled
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation(); // Just in case, though button disabled usually stops clicks.
                        // However, if disabled, the click might pass through to the wrapper anyway.
                        // If enabled, we want the button click to handle properly.
                        if (txTimeout && hash) {
                            window.open(`https://basescan.org/tx/${hash}`, '_blank');
                            return;
                        }
                        handleGM();
                    }}
                    disabled={!isConnected || isPending || (isConfirming && !txTimeout) || !!timeLeft}
                    className="group relative flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br from-[#0052FF] to-[#0035A0] text-7xl font-black text-white transition-all duration-200 hover:scale-105 hover:shadow-[0_0_80px_-10px_#0052FF] active:scale-95 shadow-[0_0_40px_-10px_rgba(0,82,255,0.4)] ring-4 ring-white/5 backdrop-blur-sm disabled:opacity-80 disabled:cursor-not-allowed disabled:pointer-events-none"
                >
                    {isPending ? (
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-16 w-16 animate-spin text-white/50" />
                            <span className="text-lg font-bold text-white/60">Signing...</span>
                        </div>
                    ) : isConfirming ? (
                        txTimeout ? (
                            <div className="flex flex-col items-center gap-2 text-center text-orange-200">
                                <span className="text-2xl font-black">Check<br />Explorer</span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-16 w-16 animate-spin text-white/50" />
                                <span className="text-lg font-bold text-white/60">Confirming...</span>
                            </div>
                        )
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
