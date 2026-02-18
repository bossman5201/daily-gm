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


export function Header() {
    return (
        <header className="flex justify-between items-center p-6 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
            <h1 className="text-2xl font-bold text-white tracking-tighter">
                Daily <span className="text-[#0052FF]">GM</span>
            </h1>
            <div className="flex gap-2">
                <Wallet>
                    <ConnectWallet className="bg-[#0052FF] text-white hover:bg-[#0040CB] rounded-full px-4 py-2 font-bold transition-all">
                        <Avatar className="h-6 w-6" />
                        <Name />
                    </ConnectWallet>
                    <WalletDropdown>
                        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                            <Avatar />
                            <Name />
                            <Address />
                            <EthBalance />
                        </Identity>
                        <WalletDropdownLink icon="wallet" href="https://keys.coinbase.com">
                            Wallet
                        </WalletDropdownLink>
                        <WalletDropdownDisconnect />
                    </WalletDropdown>
                </Wallet>
            </div>
        </header>
    );
}
