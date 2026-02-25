
import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, Log } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { CONTRACT_ADDRESS } from '../../../config/contracts';

import { getSupabaseAdmin } from '../../../lib/supabase';

// Initialize Viem Client (uses server-only RPC key, separate from client-side quota)
const client = createPublicClient({
    chain: base, // Change to baseSepolia if testing on testnet
    transport: http(process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL)
});

// ABI Events
// TODO: Replace with your actual contract deployment block number after deploying
const DEPLOYMENT_BLOCK = 0n; // ← CHANGE THIS after deploying your contract

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

        const startBlock = lastEvent?.block_number ? BigInt(lastEvent.block_number) + 1n : DEPLOYMENT_BLOCK;
        const currentBlock = await client.getBlockNumber();

        // Limit scan to 5000 blocks to prevent timeouts
        const endBlock = currentBlock - startBlock > 5000n
            ? startBlock + 5000n
            : currentBlock;

        if (startBlock > endBlock) {
            return NextResponse.json({ message: 'Already up to date', block: Number(currentBlock) });
        }

        // 3. Fetch logs from RPC in CHUNKS
        // Limit chunk size to 2000 blocks to prevent "Response too large" RPC errors
        const CHUNK_SIZE = 2000n;
        const allGmLogs: any[] = [];
        const allRestoreLogs: any[] = [];

        for (let i = startBlock; i <= endBlock; i += CHUNK_SIZE) {
            const chunkEnd = (i + CHUNK_SIZE - 1n) > endBlock ? endBlock : (i + CHUNK_SIZE - 1n);

            const [startGmLogs, startRestoreLogs] = await Promise.all([
                client.getLogs({
                    address: CONTRACT_ADDRESS,
                    event: GM_EVENT,
                    fromBlock: i,
                    toBlock: chunkEnd
                }),
                client.getLogs({
                    address: CONTRACT_ADDRESS,
                    event: RESTORE_EVENT,
                    fromBlock: i,
                    toBlock: chunkEnd
                })
            ]);

            allGmLogs.push(...startGmLogs);
            allRestoreLogs.push(...startRestoreLogs);
        }

        // Merge and sort logs by block number + index to process in order
        const allLogs = [...allGmLogs, ...allRestoreLogs].sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
            return Number(a.logIndex - b.logIndex);
        });

        if (allLogs.length === 0) {
            return NextResponse.json({ message: 'No new events', from: Number(startBlock), to: Number(endBlock) });
        }

        // --- V3.1 GOD MODE FIX: L2 Reorg Double-Count Protection ---
        // Fetch all tx_hashes from this batch
        const txHashes = allLogs.map(log => log.transactionHash);

        // Check which ones already exist in the DB
        const { data: existingEvents } = await supabase
            .from('gm_events')
            .select('tx_hash')
            .in('tx_hash', txHashes);

        const existingHashes = new Set(existingEvents?.map(e => e.tx_hash) || []);

        // Filter out logs that ALREADY exist in the DB to prevent double-counting on reorgs
        const deduplicatedLogs = allLogs.filter(log => !existingHashes.has(log.transactionHash));

        if (deduplicatedLogs.length === 0) {
            return NextResponse.json({ message: 'No new unique events (reorgs skipped)', from: Number(startBlock), to: Number(endBlock) });
        }

        // 4. Process logs & Updates
        const eventsToInsert: any[] = [];
        const userStats = new Map<string, any>();

        // Define expected structure based on Viem's Log interface
        type ExpectedLog = {
            args: { user: string; streak: bigint; timestamp: bigint };
            blockNumber: bigint;
            transactionHash: string;
            eventName: 'GM' | 'StreakRestored';
            logIndex: number;
        };

        for (const log of deduplicatedLogs) {
            const { args, blockNumber, transactionHash, eventName } = log as ExpectedLog;
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
                stats.last_gm = timestamp; // V3.1 GOD MODE FIX: Prevent Ghost Restore desync
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

        // 6. Update Users in Bulk (O(1) Network Requests)
        const addresses = Array.from(userStats.keys());

        if (addresses.length > 0) {
            // Fetch all existing users in one query
            const { data: existingUsersData } = await supabase
                .from('users')
                .select('*')
                .in('address', addresses);

            const existingUsers = new Map(existingUsersData?.map(u => [u.address, u]) || []);
            const upsertData: any[] = [];
            const currentTimeISO = new Date().toISOString();

            for (const [address, batchStats] of userStats) {
                const existing = existingUsers.get(address);

                if (existing) {
                    upsertData.push({
                        address: address,
                        current_streak: batchStats.current_streak,
                        longest_streak: Math.max(existing.longest_streak, batchStats.longest_streak),
                        total_gms: existing.total_gms + batchStats.total_gms,
                        last_gm: batchStats.last_gm ? new Date(batchStats.last_gm * 1000).toISOString() : existing.last_gm,
                        first_gm_date: existing.first_gm_date,
                        restores_used: (existing.restores_used || 0) + batchStats.restores_used,
                        total_fees_paid: Number(existing.total_fees_paid || 0) + batchStats.fees_paid,
                        broken_streaks: existing.broken_streaks || 0,
                        updated_at: currentTimeISO
                    });
                } else {
                    upsertData.push({
                        address: address,
                        current_streak: batchStats.current_streak,
                        longest_streak: batchStats.longest_streak,
                        total_gms: batchStats.total_gms,
                        last_gm: batchStats.last_gm ? new Date(batchStats.last_gm * 1000).toISOString() : null,
                        first_gm_date: batchStats.last_gm ? new Date(batchStats.last_gm * 1000).toISOString() : currentTimeISO,
                        restores_used: batchStats.restores_used,
                        total_fees_paid: batchStats.fees_paid,
                        broken_streaks: 0,
                        updated_at: currentTimeISO
                    });
                }
            }

            // Perform a single massive Upsert for all users
            const { error: upsertError } = await supabase
                .from('users')
                .upsert(upsertData, { onConflict: 'address' });

            if (upsertError) throw upsertError;
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
