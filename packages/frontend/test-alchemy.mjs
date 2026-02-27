import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http('https://base-mainnet.g.alchemy.com/v2/JYzpcLSJldnfadSZY_Pce')
});

async function main() {
    console.log("Fetching block number from Alchemy...");
    const block = await client.getBlockNumber();
    console.log("Block number:", block);
}

main().catch(console.error);
