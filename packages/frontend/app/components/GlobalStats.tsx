'use client';

import * as React from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';
import { motion, useSpring, useTransform } from 'framer-motion';

function AnimatedNumber({ value }: { value: number }) {
    const spring = useSpring(0, { bounce: 0, duration: 2000 });
    const display = useTransform(spring, (current) => Math.floor(current).toLocaleString());

    React.useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
}

export function GlobalStats() {
    const { data: totalGMCount, refetch: refetchTotal } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'totalGMCount',
    });

    const [todayCount, setTodayCount] = React.useState(0);
    const [pulse, setPulse] = React.useState(false);

    React.useEffect(() => {
        // Get start of today (UTC)
        const now = new Date();
        const todayStart = Math.floor(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).getTime() / 1000);

        const fetchToday = async () => {
            try {
                const res = await fetch(`/api/stats?type=today-count&t=${Date.now()}`, { cache: 'no-store' });
                if (res.ok) {
                    const data = await res.json();

                    // Simple animation trigger if count changed
                    setTodayCount((prev) => {
                        if (data.count > prev && prev > 0) {
                            setPulse(true);
                            setTimeout(() => setPulse(false), 2000);
                        }
                        return data.count;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch today's GM count:", err);
            }
        };

        fetchToday();

        // Polling fallback since we removed Supabase WebSockets
        const interval = setInterval(fetchToday, 30000);

        const handleOptimisticUpdate = () => {
            // Refetch today count from DB (fast)
            setTimeout(fetchToday, 1000);
            // Refetch total from blockchain RPC (needs block processing time)
            setTimeout(() => refetchTotal(), 3000);
            setTimeout(() => refetchTotal(), 5000);
        };
        window.addEventListener('optimistic-update', handleOptimisticUpdate);

        return () => {
            clearInterval(interval);
            window.removeEventListener('optimistic-update', handleOptimisticUpdate);
        };
    }, []);

    const count = Number(totalGMCount ?? 0);

    return (
        <div className="w-full max-w-md text-center py-6">
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <span className="text-white/40 text-sm font-medium tracking-wide uppercase">Total</span>
                    <span className="text-2xl font-black text-white tabular-nums">
                        <AnimatedNumber value={count} />
                    </span>
                </div>
                <div className="w-[1px] h-6 bg-white/10" />
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-300 ${pulse ? 'bg-green-400 shadow-[0_0_10px_#4ade80] scale-125' : 'bg-green-500/50'}`} />
                    <span className="text-white/40 text-sm font-medium tracking-wide uppercase">Today</span>
                    <span className="text-2xl font-black text-[#0052FF] tabular-nums">
                        <AnimatedNumber value={todayCount} />
                    </span>
                </div>
                <span className="text-lg">☀️</span>
            </div>
        </div>
    );
}

