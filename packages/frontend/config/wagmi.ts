import { http, createConfig, fallback } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { Attribution } from 'ox/erc8021';

// ERC-8021 Builder Code — auto-appended to ALL transactions
const DATA_SUFFIX = Attribution.toDataSuffix({
    codes: ['bc_caxvmr3l'],
});

export const config = createConfig({
    chains: [base, baseSepolia],
    connectors: [
        farcasterMiniApp(),
        coinbaseWallet({
            appName: 'Daily GM',
            preference: 'smartWalletOnly',
        }),
        walletConnect({
            projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID!,
            showQrModal: true,
        }),
    ],
    transports: {
        [base.id]: process.env.NEXT_PUBLIC_BASE_RPC_URL
            ? fallback([
                http(process.env.NEXT_PUBLIC_BASE_RPC_URL),
                http(), // Public RPC backup
            ])
            : http(),
        [baseSepolia.id]: http(),
    },
    dataSuffix: DATA_SUFFIX,
    ssr: true,
});
