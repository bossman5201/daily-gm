
import { createClient } from '@supabase/supabase-js';

// Fallback to empty strings to prevent build-time crash
// Runtime check will still fail if these are invalid, which is expected.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.warn('⚠️ Supply NEXT_PUBLIC_SUPABASE_URL to connect to Supabase');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
