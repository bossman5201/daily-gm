'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function OnboardingModal() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        // Check if the user has seen the onboarding before
        const hasSeenOnboarding = localStorage.getItem('hasSeenDailyGMOnboarding');
        if (!hasSeenOnboarding) {
            // Small delay for effect
            const timer = setTimeout(() => setIsOpen(true), 500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsOpen(false);
        localStorage.setItem('hasSeenDailyGMOnboarding', 'true');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={handleDismiss}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
                    >
                        {/* Decorative background glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#0052FF]/20 blur-[64px] rounded-full pointer-events-none" />

                        <div className="relative z-10 text-center">
                            {/* Icon/Visual */}
                            <div className="mx-auto w-16 h-16 bg-[#0052FF]/10 text-[#0052FF] rounded-2xl flex items-center justify-center mb-6 ring-1 ring-[#0052FF]/20">
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>

                            <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                                Welcome to Daily GM
                            </h2>
                            <p className="text-zinc-400 text-sm mb-8 leading-relaxed">
                                A fully on-chain habit tracker built on Base. Compete globally, build your streak, and prove your consistency.
                            </p>

                            {/* Steps */}
                            <div className="space-y-4 mb-8 text-left">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">1</div>
                                    <p className="text-sm text-zinc-300"><strong className="text-white block">Say GM</strong> Mint your daily GM transaction (~$0.08) to increment your streak.</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">2</div>
                                    <p className="text-sm text-zinc-300"><strong className="text-white block">Keep the Schedule</strong> You can GM every 20 hours. You have 48 hours before your streak resets!</p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">3</div>
                                    <p className="text-sm text-zinc-300"><strong className="text-white block">Climb the Leaderboard</strong> Your streak and total GMs are stored immutably forever.</p>
                                </div>
                            </div>

                            {/* Action Button */}
                            <button
                                onClick={handleDismiss}
                                className="w-full py-3 px-4 bg-[#0052FF] hover:bg-[#0047E0] text-white font-bold rounded-xl transition-colors ring-1 ring-white/10"
                            >
                                Got it, let's go!
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
