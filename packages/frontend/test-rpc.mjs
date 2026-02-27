import { createPublicClient, http, parseAbiItem } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http('https://mainnet.base.org')
});

async function main() {
    console.log("Testing 2000 block chunk on mainnet.base.org...");
    try {
        const logs = await client.getLogs({
            address: '0x35B516D4A3f29EE937F5A8b9CC9f6B218d7De988',
            event: parseAbiItem('event GM(address indexed user, uint256 streak, uint256 timestamp)'),
            fromBlock: 42680000n,
            toBlock: 42682000n
        });
        console.log("Success! Found", logs.length, "logs in 2000 block chunk.");
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main().catch(console.error);
