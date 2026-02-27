import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { getName, getAvatar } from '@coinbase/onchainkit/identity';

const apiKey = 'gRK9EoG4KJgaaz5AbC0Rmg9K1mBpSoO7';
const rpcUrl = `https://api.developer.coinbase.com/rpc/v1/base/${apiKey}`;

// Wait, getName just takes chain, not a custom client, but let's test using standard viem getEnsName with base chain and custom RPC
const client = createPublicClient({
    chain: base,
    transport: http(rpcUrl)
});

async function main() {
    console.log("Checking reverse resolution for 0x412c50D0fE3572D67B0E9627Bf8315582f90B49e...");
    try {
        const address = '0x412c50D0fE3572D67B0E9627Bf8315582f90B49e';

        // Use viem's getEnsName directly on the Base network (it checks the Universal Resolver for Basenames)
        const name = await client.getEnsName({
            address: address,
            universalResolverAddress: '0x8C1dec143f2A1dDd8dBFbCA30F2134a6217dcBDE' // Base Universal Resolver in Viem
        });

        console.log("Viem getEnsName result:", name);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

main();
