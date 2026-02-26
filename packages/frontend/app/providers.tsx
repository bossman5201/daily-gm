'use client';

import * as React from 'react';
import {
    QueryClient,
    QueryClientProvider,
} from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

import { config } from '../config/wagmi';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data is fresh for 1 minute (prevents RPC spam)
            staleTime: 60 * 1000,
            // Do not refetch on window focus
            refetchOnWindowFocus: false,
        },
    },
});

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
                <OnchainKitProvider
                    apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
                    chain={base}
                    config={{
                        paymaster: process.env.NEXT_PUBLIC_PAYMASTER_URL || undefined,
                    }}
                >
                    {children}
                </OnchainKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
