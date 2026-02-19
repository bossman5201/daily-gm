
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    // Only throw in browser/production, allow build to pass if missing
    if (typeof window !== 'undefined') {
        throw new Error('Supabase environment variables missing');
    }
}

export const supabase = createClient(supabaseUrl, supabaseKey);
