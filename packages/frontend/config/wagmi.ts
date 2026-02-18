import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { Attribution } from 'ox/erc8021';

// ERC-8021 Builder Code — auto-appended to ALL transactions
const DATA_SUFFIX = Attribution.toDataSuffix({
    codes: ['bc_caxvmr3l'],
});

export const config = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        farcasterMiniApp(),  // Primary: wallet inside Base App
        coinbaseWallet({
            appName: 'Daily GM',
            preference: 'smartWalletOnly', // Fallback: standalone browser
        }),
    ],
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
    },
    dataSuffix: DATA_SUFFIX,
    ssr: true,
});
