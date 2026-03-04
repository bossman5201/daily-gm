'use client';

import * as React from 'react';

interface OptimisticGM {
    address: string;
    txHash: string;
    timestamp: number;  // Unix seconds
}

interface GMContextType {
    optimisticGM: OptimisticGM | null;
    triggerOptimisticUpdate: (address: string, txHash: string) => void;
}

const GMContext = React.createContext<GMContextType>({
    optimisticGM: null,
    triggerOptimisticUpdate: () => { },
});

export function useGMContext() {
    return React.useContext(GMContext);
}

export function GMProvider({ children }: { children: React.ReactNode }) {
    const [optimisticGM, setOptimisticGM] = React.useState<OptimisticGM | null>(null);

    const triggerOptimisticUpdate = React.useCallback((address: string, txHash: string) => {
        const now = Math.floor(Date.now() / 1000);
        console.log('[GMContext] triggerOptimisticUpdate FIRED', { address: address.slice(0, 10), txHash: txHash.slice(0, 10), timestamp: now });
        setOptimisticGM({ address, txHash, timestamp: now });

        // Auto-clear after 15 seconds — by then server data is authoritative
        setTimeout(() => {
            setOptimisticGM(null);
        }, 15000);
    }, []);

    return (
        <GMContext.Provider value={{ optimisticGM, triggerOptimisticUpdate }}>
            {children}
        </GMContext.Provider>
    );
}
