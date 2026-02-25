
import { createClient } from '@supabase/supabase-js';

// Lightweight Database type matching our schema.sql
// This gives Supabase full type inference for all table operations
export type Database = {
    public: {
        Tables: {
            gm_events: {
                Row: {
                    id: number;
                    user_address: string;
                    streak: number;
                    block_number: number;
                    block_timestamp: number;
                    tx_hash: string;
                    event_type: string;
                    created_at: string;
                };
                Insert: {
                    user_address: string;
                    streak: number;
                    block_number: number;
                    block_timestamp: number;
                    tx_hash: string;
                    event_type?: string;
                    created_at?: string;
                };
                Update: Partial<{
                    user_address: string;
                    streak: number;
                    block_number: number;
                    block_timestamp: number;
                    tx_hash: string;
                    event_type: string;
                }>;
            };
            users: {
                Row: {
                    address: string;
                    current_streak: number;
                    longest_streak: number;
                    total_gms: number;
                    last_gm: string | null;
                    first_gm_date: string | null;
                    restores_used: number;
                    total_fees_paid: number;
                    broken_streaks: number;
                    updated_at: string;
                };
                Insert: {
                    address: string;
                    current_streak?: number;
                    longest_streak?: number;
                    total_gms?: number;
                    last_gm?: string | null;
                    first_gm_date?: string | null;
                    restores_used?: number;
                    total_fees_paid?: number;
                    broken_streaks?: number;
                    updated_at?: string;
                };
                Update: Partial<{
                    address: string;
                    current_streak: number;
                    longest_streak: number;
                    total_gms: number;
                    last_gm: string | null;
                    first_gm_date: string | null;
                    restores_used: number;
                    total_fees_paid: number;
                    broken_streaks: number;
                    updated_at: string;
                }>;
            };
        };
        Views: {
            public_leaderboard: {
                Row: {
                    address: string;
                    current_streak: number;
                    longest_streak: number;
                    total_gms: number;
                    last_gm: string | null;
                    first_gm_date: string | null;
                };
            };
        };
        Functions: Record<string, never>;
        Enums: Record<string, never>;
    };
};

// Fallback to empty strings to prevent build-time crash
// Runtime check will still fail if these are invalid, which is expected.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️ Supply NEXT_PUBLIC_SUPABASE_URL to connect to Supabase');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// --- Admin Client Singleton Pattern ---
// Prevents creating a new connection on every serverless function invocation (cold start optimization)
let supabaseAdmin: ReturnType<typeof createClient<Database>> | undefined;

export const getSupabaseAdmin = () => {
    if (supabaseAdmin) return supabaseAdmin;

    supabaseAdmin = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    );

    return supabaseAdmin;
};
