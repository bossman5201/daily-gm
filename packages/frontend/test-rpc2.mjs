import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const rpcs = [
    'https://base.llamarpc.com',
    'https://base-rpc.publicnode.com',
    'https://base.meowrpc.com'
];

async function main() {
    for (const rpc of rpcs) {
        console.log(`Testing ${rpc}...`);
        const client = createPublicClient({ chain: base, transport: http(rpc) });
        try {
            const logs = await client.getLogs({
                address: '0x35B516D4A3f29EE937F5A8b9CC9f6B218d7De988',
                event: parseAbiItem('event GM(address indexed user, uint256 streak, uint256 timestamp)'),
                fromBlock: 42680000n,
                toBlock: 42682000n
            });
            console.log(`✅ Success on ${rpc}! Found ${logs.length} logs.`);
            return; // Exit on first success
        } catch (e) {
            console.error(`❌ Failed on ${rpc}:`, e.message);
        }
    }
}

main().catch(console.error);
