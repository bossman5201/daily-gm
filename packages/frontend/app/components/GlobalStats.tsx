'use client';

import * as React from 'react';
import { useReadContract } from 'wagmi';
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';
import { motion, useSpring, useTransform } from 'framer-motion';
import { supabase } from '../../lib/supabase';

function AnimatedNumber({ value }: { value: number }) {
    const spring = useSpring(0, { bounce: 0, duration: 2000 });
    const display = useTransform(spring, (current) => Math.floor(current).toLocaleString());

    React.useEffect(() => {
        spring.set(value);
    }, [value, spring]);

    return <motion.span>{display}</motion.span>;
}

export function GlobalStats() {
    const { data: totalGMCount } = useReadContract({
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
            const { count } = await supabase
                .from('gm_events')
                .select('*', { count: 'exact', head: true })
                .eq('event_type', 'gm')
                .gte('block_timestamp', todayStart);

            if (count !== null) setTodayCount(count);
        };

        fetchToday();

        // Real-time: increment on new GMs
        const channel = supabase
            .channel('global_pulse')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'gm_events' },
                () => {
                    setTodayCount((prev) => prev + 1);
                    setPulse(true);
                    setTimeout(() => setPulse(false), 2000);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
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

