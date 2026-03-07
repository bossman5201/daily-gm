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
    const clearTimerRef = React.useRef<NodeJS.Timeout | null>(null);

    const triggerOptimisticUpdate = React.useCallback((address: string, txHash: string) => {
        const now = Math.floor(Date.now() / 1000);
        setOptimisticGM({ address, txHash, timestamp: now });

        // Clear any existing timer before setting a new one (prevents stacking timers on repeated calls)
        if (clearTimerRef.current) {
            clearTimeout(clearTimerRef.current);
        }

        // Auto-clear after 35 seconds — safely past the 30s polling interval so server data arrives first
        clearTimerRef.current = setTimeout(() => {
            setOptimisticGM(null);
            clearTimerRef.current = null;
        }, 35000);
    }, []);

    return (
        <GMContext.Provider value={{ optimisticGM, triggerOptimisticUpdate }}>
            {children}
        </GMContext.Provider>
    );
}
