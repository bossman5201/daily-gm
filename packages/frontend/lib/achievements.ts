/**
 * Achievement badge system.
 * Computed from on-chain stats — no backend needed.
 */

export interface Achievement {
    id: string;
    name: string;
    badge: string;
    description: string;
    unlocked: boolean;
}

export function getAchievements(stats: {
    totalGMs: number;
    longestStreak: number;
    currentStreak: number;
    brokenStreak: number;
}): Achievement[] {
    return [
        {
            id: 'first_gm',
            name: 'First GM',
            badge: '🏅',
            description: 'Said your first GM',
            unlocked: stats.totalGMs >= 1,
        },
        {
            id: 'week_warrior',
            name: 'Week Warrior',
            badge: '🔥',
            description: '7-day streak',
            unlocked: stats.longestStreak >= 7,
        },
        {
            id: 'monthly_master',
            name: 'Monthly Master',
            badge: '💎',
            description: '30-day streak',
            unlocked: stats.longestStreak >= 30,
        },
        {
            id: 'century_club',
            name: 'Century Club',
            badge: '⭐',
            description: '100-day streak',
            unlocked: stats.longestStreak >= 100,
        },
        {
            id: 'year_king',
            name: 'Year King',
            badge: '👑',
            description: '365-day streak',
            unlocked: stats.longestStreak >= 365,
        },
        {
            id: 'phoenix',
            name: 'Phoenix',
            badge: '🔄',
            description: 'Restored a broken streak',
            // TODO: Enable once restores_used is available from Supabase user stats
            unlocked: false,
        },
    ];
}
