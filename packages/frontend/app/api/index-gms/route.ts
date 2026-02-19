
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESS } from '../../../config/contracts';

// Helper to get Supabase Admin client
const getSupabaseAdmin = () => {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
    );
};

// Initialize Viem Client
const client = createPublicClient({
    chain: base, // Change to baseSepolia if testing on testnet
    transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL)
});

// ABI Events
const GM_EVENT = parseAbiItem('event GM(address indexed user, uint256 streak, uint256 timestamp)');
const RESTORE_EVENT = parseAbiItem('event StreakRestored(address indexed user, uint256 streak, uint256 timestamp)');

export async function GET(request: Request) {
    // 1. Secure the route (Cron Secret)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const supabase = getSupabaseAdmin();

        // 2. Get last indexed block from DB
        const { data: lastEvent } = await supabase
            .from('gm_events')
            .select('block_number')
            .order('block_number', { ascending: false })
            .limit(1)
            .single();

        const startBlock = lastEvent?.block_number ? BigInt(lastEvent.block_number) + 1n : 0n; // Or deployment block
        const currentBlock = await client.getBlockNumber();

        // Limit scan to 5000 blocks to prevent timeouts
        const endBlock = currentBlock - startBlock > 5000n
            ? startBlock + 5000n
            : currentBlock;

        if (startBlock > endBlock) {
            return NextResponse.json({ message: 'Already up to date', block: Number(currentBlock) });
        }

        // 3. Fetch BOTH logs from RPC
        // Note: viem allows fetching multiple events if we pass array, or we can fetch twice.
        // Fetching twice is safer for type inference here.
        const [gmLogs, restoreLogs] = await Promise.all([
            client.getLogs({
                address: CONTRACT_ADDRESS,
                event: GM_EVENT,
                fromBlock: startBlock,
                toBlock: endBlock
            }),
            client.getLogs({
                address: CONTRACT_ADDRESS,
                event: RESTORE_EVENT,
                fromBlock: startBlock,
                toBlock: endBlock
            })
        ]);

        // Merge and sort logs by block number + index to process in order
        const allLogs = [...gmLogs, ...restoreLogs].sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
            return Number(a.logIndex - b.logIndex);
        });

        if (allLogs.length === 0) {
            return NextResponse.json({ message: 'No new events', from: Number(startBlock), to: Number(endBlock) });
        }

        // 4. Process logs & Updates
        const eventsToInsert = [];
        const userStats = new Map();

        for (const log of allLogs) {
            const { args, blockNumber, transactionHash, eventName } = log as any;
            const user = args.user;
            const timestamp = Number(args.timestamp);
            const streak = Number(args.streak);

            if (eventName === 'GM') {
                eventsToInsert.push({
                    user_address: user,
                    streak: streak,
                    block_number: Number(blockNumber),
                    block_timestamp: timestamp,
                    tx_hash: transactionHash
                });
            }

            // Aggregate User Stats for this batch
            if (!userStats.has(user)) {
                userStats.set(user, {
                    current_streak: 0,
                    longest_streak: 0,
                    total_gms: 0,
                    last_gm: 0,
                    restores_used: 0,
                    fees_paid: 0
                });
            }

            const stats = userStats.get(user);

            if (eventName === 'GM') {
                stats.total_gms += 1;
                stats.fees_paid += 0.000025; // Approx Protocol Fee
                stats.current_streak = streak; // Contract is truth
                stats.last_gm = timestamp;
            }
            else if (eventName === 'StreakRestored') {
                stats.restores_used += 1;
                stats.fees_paid += 0.0005; // Approx Restore Fee
                stats.current_streak = streak; // Restored value
            }

            if (streak > stats.longest_streak) {
                stats.longest_streak = streak;
            }
        }

        // 5. Batch Insert Events
        if (eventsToInsert.length > 0) {
            const { error: eventError } = await supabase.from('gm_events').insert(eventsToInsert);
            if (eventError) throw eventError;
        }

        // 6. Update Users (Read-Modify-Write)
        for (const [address, batchStats] of userStats) {
            const { data: existing } = await supabase
                .from('users')
                .select('*')
                .eq('address', address)
                .single();

            const currentTimeISO = new Date().toISOString();

            if (existing) {
                await supabase.from('users').update({
                    current_streak: batchStats.current_streak,
                    longest_streak: Math.max(existing.longest_streak, batchStats.longest_streak),
                    total_gms: existing.total_gms + batchStats.total_gms,
                    last_gm: batchStats.last_gm ? new Date(batchStats.last_gm * 1000).toISOString() : existing.last_gm,

                    restores_used: (existing.restores_used || 0) + batchStats.restores_used,
                    total_fees_paid: Number(existing.total_fees_paid || 0) + batchStats.fees_paid,

                    updated_at: currentTimeISO
                }).eq('address', address);
            } else {
                await supabase.from('users').insert({
                    address: address,
                    current_streak: batchStats.current_streak,
                    longest_streak: batchStats.longest_streak,
                    total_gms: batchStats.total_gms,

                    last_gm: batchStats.last_gm ? new Date(batchStats.last_gm * 1000).toISOString() : null,
                    first_gm_date: batchStats.last_gm ? new Date(batchStats.last_gm * 1000).toISOString() : currentTimeISO,

                    restores_used: batchStats.restores_used,
                    total_fees_paid: batchStats.fees_paid,
                    broken_streaks: 0
                });
            }
        }

        return NextResponse.json({
            success: true,
            events: allLogs.length,
            updatedUsers: userStats.size,
            fromBlock: Number(startBlock),
            toBlock: Number(endBlock)
        });

    } catch (error) {
        console.error('Indexer Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
