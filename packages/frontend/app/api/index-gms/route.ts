
import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem, Log, getAddress } from 'viem';
import { base } from 'viem/chains';
import { CONTRACT_ADDRESS } from '../../../config/contracts';

import { sql } from '@vercel/postgres';
// Initialize Viem Client (uses public RPC to bypass strict Alchemy Free Tier block range limits)
const client = createPublicClient({
    chain: base,
    transport: http('https://base-rpc.publicnode.com')
});

// ABI Events
const DEPLOYMENT_BLOCK = BigInt(process.env.DEPLOYMENT_BLOCK || '0');

const FEE_ABI = [
    { inputs: [], name: 'protocolFee', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
    { inputs: [], name: 'restoreFee', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const;

const GM_EVENT = parseAbiItem('event GM(address indexed user, uint256 streak, uint256 timestamp)');
const RESTORE_EVENT = parseAbiItem('event StreakRestored(address indexed user, uint256 streak, uint256 timestamp)');
const MILESTONE_EVENT = parseAbiItem('event Milestone(address indexed user, uint256 streak)');
const REFERRED_EVENT = parseAbiItem('event Referred(address indexed user, address indexed referredBy)');

export async function GET(request: Request) {
    // 1. Secure the route (Cron Secret)
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization');
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        // Read current fees from contract (not hardcoded)
        const [protocolFeeWei, restoreFeeWei] = await Promise.all([
            client.readContract({ address: CONTRACT_ADDRESS, abi: FEE_ABI, functionName: 'protocolFee' }),
            client.readContract({ address: CONTRACT_ADDRESS, abi: FEE_ABI, functionName: 'restoreFee' }),
        ]) as [bigint, bigint];

        // 2. Get last indexed block from dedicated sync_state table
        const { rows: syncStateResult } = await sql`SELECT last_indexed_block FROM public.sync_state WHERE id = 1 LIMIT 1;`;

        const startBlock = syncStateResult.length > 0
            ? BigInt(syncStateResult[0].last_indexed_block) + 1n
            : DEPLOYMENT_BLOCK;

        const latestBlock = await client.getBlockNumber();
        const currentBlock = latestBlock - 5n; // ~10s finality buffer for L2 reorg safety

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
        const allMilestoneLogs: any[] = [];
        const allReferredLogs: any[] = [];

        for (let i = startBlock; i <= endBlock; i += CHUNK_SIZE) {
            const chunkEnd = (i + CHUNK_SIZE - 1n) > endBlock ? endBlock : (i + CHUNK_SIZE - 1n);

            const [chunkGmLogs, chunkRestoreLogs, chunkMilestoneLogs, chunkReferredLogs] = await Promise.all([
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
                }),
                client.getLogs({
                    address: CONTRACT_ADDRESS,
                    event: MILESTONE_EVENT,
                    fromBlock: i,
                    toBlock: chunkEnd
                }),
                client.getLogs({
                    address: CONTRACT_ADDRESS,
                    event: REFERRED_EVENT,
                    fromBlock: i,
                    toBlock: chunkEnd
                })
            ]);

            allGmLogs.push(...chunkGmLogs);
            allRestoreLogs.push(...chunkRestoreLogs);
            allMilestoneLogs.push(...chunkMilestoneLogs);
            allReferredLogs.push(...chunkReferredLogs);
        }

        // Merge and sort logs by block number + index to process in order
        const allLogs = [...allGmLogs, ...allRestoreLogs, ...allMilestoneLogs, ...allReferredLogs].sort((a, b) => {
            if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
            return Number(a.logIndex - b.logIndex);
        });

        if (allLogs.length === 0) {
            // No logs found, but we still MUST update the sync tracker so we don't scan this empty block range forever
            await sql`
                INSERT INTO public.sync_state (id, last_indexed_block, updated_at)
                VALUES (1, ${Number(endBlock)}, NOW())
                ON CONFLICT (id) DO UPDATE SET last_indexed_block = EXCLUDED.last_indexed_block, updated_at = NOW();
            `;
            return NextResponse.json({ message: 'No new events', from: Number(startBlock), to: Number(endBlock) });
        }

        // --- V3.1 GOD MODE FIX: L2 Reorg Double-Count Protection ---
        // Fetch all tx_hashes from this batch
        const txHashes = allLogs.map(log => log.transactionHash);

        // Check which ones already exist in the DB
        let existingHashes = new Set<string>();
        if (txHashes.length > 0) {
            const { rows: existingEvents } = await sql`
             SELECT tx_hash FROM public.gm_events WHERE tx_hash = ANY(${txHashes as any}::text[])
           `;
            existingHashes = new Set(existingEvents.map(e => e.tx_hash));
        }

        // Filter out logs that ALREADY exist in the DB to prevent double-counting on reorgs
        const deduplicatedLogs = allLogs.filter(log => !existingHashes.has(log.transactionHash));

        if (deduplicatedLogs.length === 0) {
            // Fast forward the sync state over the reorgs
            await sql`
                INSERT INTO public.sync_state (id, last_indexed_block, updated_at)
                VALUES (1, ${Number(endBlock)}, NOW())
                ON CONFLICT (id) DO UPDATE SET last_indexed_block = EXCLUDED.last_indexed_block, updated_at = NOW();
            `;
            return NextResponse.json({ message: 'No new unique events (reorgs skipped)', from: Number(startBlock), to: Number(endBlock) });
        }

        // 4. Process logs & Updates
        const eventsToInsert: any[] = [];
        const userStats = new Map<string, any>();

        type ExpectedLog = {
            args: Record<string, any>;
            blockNumber: bigint;
            transactionHash: string;
            eventName: 'GM' | 'StreakRestored' | 'Milestone' | 'Referred';
            logIndex: number;
        };

        for (const log of deduplicatedLogs) {
            const { args, blockNumber, transactionHash, eventName } = log as ExpectedLog;

            // Handle Milestone and Referred events — just store, don't affect user stats
            if (eventName === 'Milestone') {
                const user = getAddress(args.user);
                eventsToInsert.push({
                    user_address: user,
                    streak: Number(args.streak),
                    block_number: Number(blockNumber),
                    block_timestamp: 0, // Milestone event has no timestamp arg
                    tx_hash: transactionHash,
                    event_type: 'milestone'
                });
                continue;
            }

            if (eventName === 'Referred') {
                const user = getAddress(args.user);
                eventsToInsert.push({
                    user_address: user,
                    streak: 0, // No streak for referral events
                    block_number: Number(blockNumber),
                    block_timestamp: 0,
                    tx_hash: transactionHash,
                    event_type: 'referred'
                });
                continue;
            }

            // GM and StreakRestored events
            const user = getAddress(args.user);
            const timestamp = Number(args.timestamp);
            const streak = Number(args.streak);

            // Insert BOTH GM and StreakRestored events into gm_events
            // so the tx_hash unique constraint deduplicates both on re-scans
            eventsToInsert.push({
                user_address: user,
                streak: streak,
                block_number: Number(blockNumber),
                block_timestamp: timestamp,
                tx_hash: transactionHash,
                event_type: eventName === 'GM' ? 'gm' : 'restore'
            });

            // Aggregate User Stats for this batch
            if (!userStats.has(user)) {
                userStats.set(user, {
                    current_streak: 0,
                    longest_streak: 0,
                    total_gms: 0,
                    last_gm: 0,
                    restores_used: 0,
                    fees_paid_wei: 0n
                });
            }

            const stats = userStats.get(user);

            if (eventName === 'GM') {
                stats.total_gms += 1;
                stats.fees_paid_wei += protocolFeeWei;
                stats.current_streak = streak; // Contract is truth
                stats.last_gm = timestamp;
            }
            else if (eventName === 'StreakRestored') {
                stats.restores_used += 1;
                stats.fees_paid_wei += restoreFeeWei;
                stats.current_streak = streak; // Restored value
                stats.last_gm = timestamp; // V3.1 GOD MODE FIX: Prevent Ghost Restore desync
            }

            if (streak > stats.longest_streak) {
                stats.longest_streak = streak;
            }
        }

        // 5. Batch Insert Events
        if (eventsToInsert.length > 0) {
            // Because edge functions limit query param length, we'll insert one-by-one or in small batches
            for (const event of eventsToInsert) {
                await sql`
                    INSERT INTO public.gm_events (user_address, streak, block_number, block_timestamp, tx_hash, created_at)
                    VALUES (${event.user_address}, ${event.streak}, ${event.block_number}, ${event.block_timestamp}, ${event.tx_hash}, NOW())
                    ON CONFLICT (tx_hash) DO NOTHING;
                `;
            }
        }

        // 6. Update Users in Bulk (O(1) Network Requests)
        const addresses = Array.from(userStats.keys());

        if (addresses.length > 0) {
            // Fetch all existing users in one query
            const { rows: existingUsersData } = await sql`
                SELECT * FROM public.users WHERE address = ANY(${addresses as any}::text[])
            `;

            const existingUsers = new Map(existingUsersData.map(u => [u.address, u]));

            for (const [address, batchStats] of userStats) {
                const existing = existingUsers.get(address);

                // Calculate correct logic
                const newTotalGms = (existing?.total_gms || 0) + batchStats.total_gms;
                const newLongestStreak = Math.max(existing?.longest_streak || 0, batchStats.longest_streak);

                let newLastGm = null;
                if (batchStats.last_gm) {
                    newLastGm = new Date(batchStats.last_gm * 1000).toISOString();
                } else if (existing?.last_gm) {
                    newLastGm = existing.last_gm.toISOString();
                }

                let newFirstGmDate = existing?.first_gm_date?.toISOString();
                if (!newFirstGmDate && batchStats.last_gm) {
                    newFirstGmDate = new Date(batchStats.last_gm * 1000).toISOString();
                }

                const newRestoresUsed = (existing?.restores_used || 0) + batchStats.restores_used;

                // Add the Wei to original total if exists
                let baseFeesNum = 0;
                if (existing?.total_fees_paid) {
                    baseFeesNum = parseFloat(existing.total_fees_paid);
                }
                const newFeesNum = baseFeesNum + (Number(batchStats.fees_paid_wei) / 1e18);

                await sql`
                    INSERT INTO public.users (
                        address, current_streak, longest_streak, total_gms, last_gm, 
                        first_gm_date, restores_used, total_fees_paid, updated_at
                    )
                    VALUES (
                        ${address}, 
                        ${batchStats.current_streak}, 
                        ${newLongestStreak}, 
                        ${newTotalGms}, 
                        ${newLastGm}, 
                        ${newFirstGmDate || new Date().toISOString()}, 
                        ${newRestoresUsed}, 
                        ${newFeesNum}, 
                        NOW()
                    )
                    ON CONFLICT (address) DO UPDATE SET 
                        current_streak = EXCLUDED.current_streak,
                        longest_streak = EXCLUDED.longest_streak,
                        total_gms = EXCLUDED.total_gms,
                        last_gm = EXCLUDED.last_gm,
                        first_gm_date = COALESCE(public.users.first_gm_date, EXCLUDED.first_gm_date),
                        restores_used = EXCLUDED.restores_used,
                        total_fees_paid = EXCLUDED.total_fees_paid,
                        updated_at = NOW();
                `;
            }
        }

        // 7. FINALLY: Update the global sync state tracker so the next cron job starts from `endBlock`
        await sql`
            INSERT INTO public.sync_state (id, last_indexed_block, updated_at)
            VALUES (1, ${Number(endBlock)}, NOW())
            ON CONFLICT (id) DO UPDATE SET last_indexed_block = EXCLUDED.last_indexed_block, updated_at = NOW();
        `;

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
