import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const client = createPublicClient({
    chain: base,
    transport: http()
});

async function main() {
    console.log("Checking contract code on Base Mainnet...");
    const code = await client.getBytecode({
        address: '0x35B516D4A3f29EE937F5A8b9CC9f6B218d7De988'
    });
    console.log("Code length:", code ? code.length : 0);
    console.log("Code:", code ? "Exists" : "Null/Empty");

    // Get the current block
    const block = await client.getBlockNumber();
    console.log("Current block:", block);
}

main().catch(console.error);
