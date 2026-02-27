import { getName, getAvatar } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

async function testResolution() {
    console.log('Testing Basename Resolution for user address...');

    // User's provided address
    const address = '0xbd14b65E9c6E767F02D1900894261735F5f48A57';

    // Use the explicit Vercel Production API Key to see if it fails
    // The OnchainKit provider builds the URL like this internally if an API key is provided
    const VERCEL_API_KEY = "gRK9EoG4KJgaaz5AbC0Rmg9K1mBpSoO7";

    // We can simulate the environment by patching process.env so OnchainKit sees it
    process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY = VERCEL_API_KEY;

    try {
        const name = await getName({ address, chain: base });
        console.log('Resolved Name:', name);

        if (name) {
            const avatar = await getAvatar({ ensName: name, chain: base });
            console.log('Resolved Avatar:', avatar);
        }
    } catch (e) {
        console.error('Error resolving:', e);
    }
}

testResolution();
