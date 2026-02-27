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
    return (
        <header className="flex justify-between items-center px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
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
        </header>
    );
}
