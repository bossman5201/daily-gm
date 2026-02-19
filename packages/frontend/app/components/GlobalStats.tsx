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
    const { data: totalGMCount } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'totalGMCount',
    });

    const count = Number(totalGMCount ?? 0);

    return (
        <div className="w-full max-w-md text-center py-6">
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                <span className="text-white/40 text-sm font-medium tracking-wide uppercase">Total GMs</span>
                <span className="text-2xl font-black text-white tabular-nums">
                    <AnimatedNumber value={count} />
                </span>
                <span className="text-lg">☀️</span>
            </div>
        </div>
    );
}
