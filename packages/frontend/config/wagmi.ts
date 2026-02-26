import { http, createConfig, fallback } from 'wagmi';
import { base } from 'wagmi/chains';
import { coinbaseWallet, walletConnect } from 'wagmi/connectors';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { Attribution } from 'ox/erc8021';

// ERC-8021 Builder Code — auto-appended to ALL transactions
const DATA_SUFFIX = Attribution.toDataSuffix({
    codes: ['bc_caxvmr3l'],
});

const coinbaseRpcUrl = process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY
    ? `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}`
    : undefined;

export const config = createConfig({
    chains: [base],
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
        [base.id]: fallback([
            coinbaseRpcUrl ? http(coinbaseRpcUrl) : http(),
            http('https://mainnet.base.org'),
        ]),
    },
    dataSuffix: DATA_SUFFIX,
    ssr: true,
});
