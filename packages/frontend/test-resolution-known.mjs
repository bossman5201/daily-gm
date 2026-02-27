import { getAddress, getName } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

async function testResolution() {
    try {
        console.log('Testing known Basename (brian.base.eth)...');
        const brianAddress = await getAddress({ name: 'brian.base.eth', chain: base });
        console.log('Brian Address:', brianAddress);

        if (brianAddress) {
            const brianName = await getName({ address: brianAddress, chain: base });
            console.log('Reverse resolve Brian Address:', brianName);
        }

        console.log('\nTesting user address (0x412c50D0fE3572D67B0E9627Bf8315582f90B49e)...');
        const userName = await getName({ address: '0x412c50D0fE3572D67B0E9627Bf8315582f90B49e', chain: base });
        console.log('User Name:', userName);

    } catch (e) {
        console.error('Error:', e);
    }
}

testResolution();
