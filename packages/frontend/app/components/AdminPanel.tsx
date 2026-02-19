'use client';

import * as React from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, type BaseError } from 'wagmi';
import { formatEther } from 'viem';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { CONTRACT_ADDRESS, DAILY_GM_ABI } from '../../config/contracts';

export function AdminPanel() {
    const { address } = useAccount();
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    // Check if current user is owner
    const { data: ownerAddress, isError, error: readError } = useReadContract({
        address: CONTRACT_ADDRESS,
        abi: DAILY_GM_ABI,
        functionName: 'owner',
    });

    const { data: hash, error, isPending, writeContract } = useWriteContract();

    const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
        hash,
    });

    const isOwner = isMounted && address && ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase();

    if (!isMounted || !isOwner) return null;

    const handleWithdraw = () => {
        writeContract({
            address: CONTRACT_ADDRESS,
            abi: DAILY_GM_ABI,
            functionName: 'withdraw',
        });
    };

    return (
        <div className="fixed bottom-4 right-4 p-4 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg">
            <h3 className="text-sm font-bold text-white mb-2">Admin Panel</h3>
            <Button
                onClick={handleWithdraw}
                disabled={isPending || isConfirming}
                variant="outline"
                className="w-full text-xs"
            >
                {isPending || isConfirming ? (
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                ) : null}
                Withdraw Fees
            </Button>
            {isSuccess && <div className="text-green-500 text-xs mt-2">Withdrawn!</div>}
            {error && (
                <div className="text-red-500 text-[10px] mt-2 max-w-[150px]">
                    {(error as BaseError).shortMessage || error.message}
                </div>
            )}
        </div>
    );
}
