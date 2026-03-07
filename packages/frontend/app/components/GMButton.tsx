'use client';

import * as React from 'react';
import { useAccount, useReadContract, useSwitchChain, type BaseError } from 'wagmi';
import { useWriteContracts, useCallsStatus } from 'wagmi/experimental';
import { parseEther } from 'viem';
import { base } from 'wagmi/chains';



import { Loader2, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { motion, useAnimation } from "framer-motion";
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';
import { parseError } from '../../lib/error';
import { sdk } from '@farcaster/miniapp-sdk';
import { useGMContext } from '../context/GMContext';

export function GMButton() {
    const { address, isConnected, chainId } = useAccount();
    const { triggerOptimisticUpdate } = useGMContext();
    const { writeContracts, data: callId, isPending, error } = useWriteContracts({
        mutation: {
            onSuccess: () => {
                toast.dismiss();
                toast.success("Transaction sent! Waiting for confirmation...");
            },
            onError: (err: any) => {
                const cleanMessage = parseError(err);
                toast.dismiss();
                toast.error(cleanMessage);
                // Transaction failed — clear pendingGM so fallback stops polling
                pendingGMRef.current = false;
            }
        }
    });

    const { switchChain } = useSwitchChain();

    const { data: callsStatus } = useCallsStatus({
        id: (callId as any)?.id || (typeof callId === 'string' ? callId : ''),
        query: {
            enabled: !!callId,
            refetchInterval: (query: any) => query.state?.data?.status === 'CONFIRMED' ? false : 1000,
        }
    });

    const isConfirming = (callsStatus as any)?.status === 'PENDING';
    const isSuccess = (callsStatus as any)?.status === 'CONFIRMED';
    const hash = (callsStatus as any)?.receipts?.[0]?.transactionHash;

    const controls = useAnimation();

    // Read the protocol fee from contract
    const { data: protocolFee } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'protocolFee',
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // DUAL-TRIGGER: Track pending GM and watch blockchain for confirmation
    // ─────────────────────────────────────────────────────────────────────────────
    const pendingGMRef = React.useRef(false);
    const previousLastGMTimeRef = React.useRef<bigint | number | null>(null);
    const hasTriggeredUpdateRef = React.useRef(false);
    const [pendingGMState, setPendingGMState] = React.useState(false); // For triggering fast polling

    // Resume pending GM from sessionStorage (survives page reloads during wallet flow)
    React.useEffect(() => {
        try {
            const saved = sessionStorage.getItem('pendingGM');
            if (saved === 'true') {
                pendingGMRef.current = true;
                hasTriggeredUpdateRef.current = false;
                setPendingGMState(true);
            }
        } catch {
            // sessionStorage not available — safe to ignore
        }
    }, []);

    // Read the last GM time for this user — with fast polling when a GM is pending
    const { data: userStats, refetch } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'userStats',
        args: [address as `0x${string}`],
        query: {
            enabled: !!address,
            // Fast polling (every 2s) when a GM is pending, otherwise no auto-poll
            refetchInterval: pendingGMState ? 2000 : false,
        }
    });

    const lastGMTime = userStats ? (userStats as [bigint | number, unknown, unknown, unknown, unknown])[0] : null;

    // ─────────────────────────────────────────────────────────────────────────────
    // Shared function: fire optimistic update + background server sync
    // Called by BOTH the primary (isSuccess) and fallback (lastGMTime change) paths
    // ─────────────────────────────────────────────────────────────────────────────
    const fireOptimisticAndSync = React.useCallback((txHashValue: string) => {
        if (hasTriggeredUpdateRef.current) return; // Prevent double-fire
        hasTriggeredUpdateRef.current = true;
        pendingGMRef.current = false;
        setPendingGMState(false);
        try { sessionStorage.removeItem('pendingGM'); } catch { /* safe to ignore */ }

        // 1. INSTANT: Update all UI components via React Context
        if (address) {
            triggerOptimisticUpdate(address, txHashValue);
        }

        // 2. BACKGROUND: Sync with server (UI already updated, user doesn't wait)
        if (address) {
            fetch('/api/optimistic-gm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address, txHash: txHashValue })
            }).then(() => {
                window.dispatchEvent(new Event('optimistic-update'));
                fetch('/api/trigger-index', { method: 'POST' }).catch(console.error);
            }).catch(console.error);
        }

        // 3. Staggered refetches for the cooldown timer
        setTimeout(() => refetch(), 1000);
        setTimeout(() => refetch(), 3000);
        setTimeout(() => refetch(), 5000);

        // 4. Confetti!
        import('canvas-confetti').then((confetti) => {
            confetti.default({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.6 },
                colors: ['#0052FF', '#FFFFFF', '#000000']
            });
        });
    }, [address, triggerOptimisticUpdate, refetch]);

    // ─────────────────────────────────────────────────────────────────────────────
    // PRIMARY TRIGGER: isSuccess from useCallsStatus (if it fires)
    // ─────────────────────────────────────────────────────────────────────────────
    React.useEffect(() => {
        if (isSuccess && !hasTriggeredUpdateRef.current) {
            fireOptimisticAndSync(hash || '');
        }
    }, [isSuccess, hash, fireOptimisticAndSync]);

    // ─────────────────────────────────────────────────────────────────────────────
    // FALLBACK TRIGGER: Watch lastGMTime for changes (blockchain confirms the GM)
    // This fires even if useCallsStatus never returns CONFIRMED
    // ─────────────────────────────────────────────────────────────────────────────
    React.useEffect(() => {
        if (lastGMTime === null || lastGMTime === undefined) return;

        const currentTime = BigInt(lastGMTime as any);

        // Initialize the previous value on first load
        if (previousLastGMTimeRef.current === null) {
            previousLastGMTimeRef.current = currentTime;
            return;
        }

        const previousTime = BigInt(previousLastGMTimeRef.current as any);

        // If lastGMTime changed AND we have a pending GM, the blockchain confirmed it!
        if (currentTime > previousTime && pendingGMRef.current && !hasTriggeredUpdateRef.current) {
            fireOptimisticAndSync(''); // No hash available from this path
        }

        // Always update the ref to track the latest value
        previousLastGMTimeRef.current = currentTime;
    }, [lastGMTime, fireOptimisticAndSync]);

    // ─────────────────────────────────────────────────────────────────────────────
    // Safety timeout: Stop fast polling after 90 seconds if nothing happened
    // ─────────────────────────────────────────────────────────────────────────────
    React.useEffect(() => {
        if (!pendingGMState) return;
        const timeout = setTimeout(() => {
            pendingGMRef.current = false;
            setPendingGMState(false);
        }, 90000);
        return () => clearTimeout(timeout);
    }, [pendingGMState]);

    const [timeLeft, setTimeLeft] = React.useState<string | null>(null);
    const [isLapsed, setIsLapsed] = React.useState(false);
    const [txTimeout, setTxTimeout] = React.useState(false);
    const [streakStatus, setStreakStatus] = React.useState<'safe' | 'warning' | 'danger' | null>(null);

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
            setStreakStatus(null);
            return;
        }

        const interval = setInterval(() => {
            const now = Math.floor(Date.now() / 1000);
            const lastTime = Number(lastGMTime);

            // If lastTime is 0, they haven't GM'd yet
            if (lastTime === 0) {
                setTimeLeft(null);
                setIsLapsed(false);
                setStreakStatus(null);
                return;
            }

            const nextGM = lastTime + (20 * 60 * 60); // Match contract's 20h cooldown
            const diff = nextGM - now;

            // Check if streak is lapsed (>48h and <9 days)
            const timeSinceLastGM = now - lastTime;
            const hasLapsed = timeSinceLastGM > (48 * 60 * 60) && timeSinceLastGM <= ((48 + 7 * 24) * 60 * 60);
            setIsLapsed(hasLapsed);

            // Streak shield status
            if (timeSinceLastGM < 20 * 3600) setStreakStatus('safe');         // < 20h — still in cooldown
            else if (timeSinceLastGM < 36 * 3600) setStreakStatus('safe');    // 20-36h — can GM, still safe
            else if (timeSinceLastGM < 48 * 3600) setStreakStatus('danger');  // 36-48h — about to break!
            else setStreakStatus('warning');                                   // > 48h — already broken

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

    const isWrongChain = isConnected && chainId !== base.id;
    const gmConfirmed = isSuccess || hasTriggeredUpdateRef.current;

    const handleGM = () => {
        if (isWrongChain) {
            switchChain({ chainId: base.id });
            return;
        }

        // 🚀 INJECT: Silently capture native Farcaster / Coinbase Profile from the Mini App SDK
        const fetchAndSaveProfile = async () => {
            try {
                const ctx = await sdk.context;
                const profile = ctx?.user;
                if (profile) {
                    fetch('/api/save-profile', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            address,
                            username: profile.username,
                            pfpUrl: profile.pfpUrl,
                            displayName: profile.displayName
                        })
                    }).catch(console.error);
                }
            } catch (err) {
                console.error("Failed to read context", err);
            }
        };
        fetchAndSaveProfile();

        // Mark pending GM BEFORE sending the transaction —
        // this starts fast blockchain polling to detect confirmation
        pendingGMRef.current = true;
        hasTriggeredUpdateRef.current = false;
        setPendingGMState(true);
        try { sessionStorage.setItem('pendingGM', 'true'); } catch { /* safe to ignore */ }

        // Send the transaction using useWriteContracts to explicitly request CDP Paymaster sponsorship
        const paymasterUrl = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY
            ? `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}`
            : '';

        writeContracts({
            contracts: [
                {
                    address: CONTRACT_ADDRESS,
                    abi: DAILY_GM_ABI as any, // Cast ABI to any to bypass strict literal inference issues in Wagmi experimental batch contracts
                    functionName: 'gm',
                    args: ['0x0000000000000000000000000000000000000000' as `0x${string}`], // No referrer (TODO: read from URL param ?ref=0x...)
                    value: protocolFee ?? parseEther('0.000025')
                } as any
            ],
            capabilities: {
                paymasterService: {
                    url: paymasterUrl
                }
            }
        });
    };

    const handleShare = async () => {
        const streak = userStats ? Number((userStats as unknown as [bigint, bigint, bigint, bigint, bigint])[1]) : 0;
        const APP_URL = process.env.NEXT_PUBLIC_URL || 'https://daily-gm-zeta.vercel.app';

        try {
            await sdk.actions.composeCast({
                text: `☀️ Just said GM on Base! My streak: ${streak} days 🔥\n\nSay yours:`,
                embeds: [APP_URL],
            });
        } catch {
            // Not in a mini app context — fallback silently
        }
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

        }
    };

    return (
        <div className="flex flex-col items-center gap-4">
            {isLapsed && !gmConfirmed && (
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
                            window.open(`https://basescan.org/tx/${hash}`, '_blank', 'noopener,noreferrer');
                            return;
                        }
                        handleGM();
                    }}
                    disabled={!isConnected || isPending || (isConfirming && !txTimeout) || !!timeLeft}
                    className={`group relative flex h-72 w-72 items-center justify-center rounded-full bg-gradient-to-br from-[#0052FF] to-[#0035A0] text-7xl font-black text-white transition-all duration-300 hover:scale-105 hover:-rotate-3 hover:shadow-[0_0_80px_-10px_#0052FF] active:scale-95 backdrop-blur-sm disabled:opacity-80 disabled:cursor-not-allowed disabled:pointer-events-none ${streakStatus === 'danger'
                        ? 'ring-4 ring-red-500/60 shadow-[0_0_60px_-10px_rgba(239,68,68,0.6)] animate-pulse'
                        : streakStatus === 'warning'
                            ? 'ring-4 ring-yellow-500/40 shadow-[0_0_40px_-10px_rgba(234,179,8,0.4)]'
                            : 'ring-4 ring-[#0052FF]/30 shadow-[0_0_60px_-10px_rgba(0,82,255,0.4)] animate-[pulse_3s_ease-in-out_infinite]'
                        }`}
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
                    ) : !isConnected ? (
                        <span className="text-3xl">☀️ GM</span>
                    ) : (
                        "GM"
                    )}
                </button>
            </motion.div>

            {hash && <div className="text-xs text-gray-500">Tx: {hash.slice(0, 6)}...{hash.slice(-4)}</div>}
            {gmConfirmed && <div className="text-green-500 font-bold">GM Sent! Streak Updated!</div>}
            {gmConfirmed && (
                <button
                    onClick={handleShare}
                    className="text-sm font-bold text-[#0052FF] hover:text-white transition-colors mt-1"
                >
                    📣 Post on Base App
                </button>
            )}
            {
                error && (
                    <div className="text-red-500 text-sm max-w-[300px] text-center">
                        Error: {(error as BaseError).shortMessage || error.message}
                    </div>
                )
            }
        </div >
    );
}
