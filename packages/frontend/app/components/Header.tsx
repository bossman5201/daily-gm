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
import { useEffect, useState } from 'react';

export function Header() {
    const [farcasterProfile, setFarcasterProfile] = useState<{ username?: string; pfpUrl?: string; displayName?: string } | null>(null);

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const { sdk } = await import('@farcaster/miniapp-sdk');
                const ctx = await sdk.context;
                if (ctx?.user) {
                    setFarcasterProfile(ctx.user);
                }
            } catch (err) {
                // Not in a frame, ignore
            }
        };
        loadProfile();
    }, []);

    return (
        <header className="flex justify-between items-center px-6 py-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
            <h1 className="text-2xl font-bold text-white tracking-tighter">
                Daily <span className="text-[#0052FF]">GM</span>
            </h1>
            <div className="flex flex-col items-end gap-1">
                <div className="flex gap-3 items-center">
                    {/* The Instant Profile Badge (No Wallet Needed) */}
                    {farcasterProfile ? (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 pl-1 pr-3 py-1 rounded-full animate-in fade-in zoom-in duration-500">
                            {farcasterProfile.pfpUrl ? (
                                <img src={farcasterProfile.pfpUrl} alt="PFP" className="w-6 h-6 rounded-full object-cover" />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-[#0052FF] flex items-center justify-center text-xs font-bold text-white">
                                    {(farcasterProfile.displayName || farcasterProfile.username || '?').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <span className="text-xs font-medium text-white/80">
                                {farcasterProfile.displayName || farcasterProfile.username}
                            </span>
                        </div>
                    ) : (
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
                    )}
                </div>
                {!farcasterProfile && <span className="text-[10px] text-white/30 tracking-wide mt-1">Coinbase Wallet & Farcaster</span>}
            </div>
        </header>
    );
}
