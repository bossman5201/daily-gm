import { createClient } from '@supabase/supabase-js';

const url = "https://nszwqhzjuxwdxgtlxduw.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zendxaHpqdXh3ZHhndGx4ZHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNjgxNjcsImV4cCI6MjA4Nzc0NDE2N30.za5hho1p4D--XTgPLTTviCbtRQn_QVQ-6bPWhhGZAjg";

const supabase = createClient(url, key);

async function testConnection() {
    console.log("Testing NEW Supabase connection...");
    try {
        const { data, error } = await supabase.from('gm_events').select('*').limit(5);
        if (error) {
            console.error("Supabase Error:", error);
        } else {
            console.log("Supabase Data:", data);
            console.log("Connection successful! Database is healthy and returning properly.");
        }
    } catch (e) {
        console.error("Catch Error:", e);
    }
}

testConnection();
