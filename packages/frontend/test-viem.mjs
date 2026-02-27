import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http()
});

async function main() {
    console.log("Fetching block number...");
    const block = await client.getBlockNumber();
    console.log("Block number:", block);
}

main().catch(console.error);
