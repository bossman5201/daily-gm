/**
 * Streak-based rank system.
 * Maps current streak to a rank name and badge emoji.
 */

export interface Rank {
    name: string;
    badge: string;
    minStreak: number;
}

const RANKS: Rank[] = [
    { name: 'Legend', badge: '👑', minStreak: 365 },
    { name: 'OG', badge: '⭐', minStreak: 100 },
    { name: 'Committed', badge: '🔥', minStreak: 30 },
    { name: 'Regular', badge: '☀️', minStreak: 7 },
    { name: 'Newcomer', badge: '🌱', minStreak: 1 },
];

export function getRank(streak: number): Rank | null {
    if (streak < 1) return null;
    for (const rank of RANKS) {
        if (streak >= rank.minStreak) return rank;
    }
    return null;
}
