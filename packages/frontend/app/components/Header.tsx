'use client';

import {
    ConnectWallet,
    Wallet,
    WalletDropdown,
    WalletDropdownDisconnect,
    WalletDropdownLink,
} from '@coinbase/onchainkit/wallet';
import {
    Address,
    Avatar,
    Name,
    Identity,
    EthBalance,
} from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';
import { useName } from '@coinbase/onchainkit/identity';
import { base } from 'wagmi/chains';

export function Header() {
    const { address } = useAccount();
    const { data: nameData, isLoading, isError, error } = useName({ address, chain: base });

    return (
        <header className="flex flex-col px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
            {address && (isError || (!nameData && !isLoading)) && (
                <div className="w-full bg-red-900/50 border border-red-500 text-white p-2 text-xs font-mono rounded-md mb-4 break-words">
                    <p className="font-bold">Name Debug:</p>
                    <p>Address: {address}</p>
                    <p>Status: {isLoading ? 'Loading' : isError ? 'Error' : 'No Name Data'}</p>
                    {error && <p className="text-red-300">{error.message}</p>}
                </div>
            )}
            <div className="flex justify-between items-center w-full">
                <h1 className="text-2xl font-bold text-white tracking-tighter">
                    Daily <span className="text-[#0052FF]">GM</span>
                </h1>
                <div className="flex flex-col items-end gap-1">
                    <Wallet>
                        <ConnectWallet className="bg-[#0052FF] text-white hover:bg-[#0040CB] rounded-full px-4 py-2 font-bold transition-all">
                            <Avatar chain={base} className="h-6 w-6" />
                            <Name chain={base} />
                        </ConnectWallet>
                        <WalletDropdown>
                            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                                <Avatar chain={base} />
                                <Name chain={base} />
                                <Address />
                                <EthBalance />
                            </Identity>
                            <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">
                                Wallet
                            </WalletDropdownLink>
                            <WalletDropdownDisconnect />
                        </WalletDropdown>
                    </Wallet>
                    <span className="text-[10px] text-white/30 tracking-wide">Coinbase Wallet & Farcaster</span>
                </div>
            </div>
        </header>
    );
}
