export default function TermsPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-[#0052FF]">Terms of Service</h1>
                <p className="text-sm text-gray-400">Last Updated: February 2026</p>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">1. The Game</h2>
                    <p className="text-gray-300">
                        "Daily GM" is a social experiment and on-chain game. Users pay a protocol fee to maintain a "streak".
                        The streak is a visual indicator of participation and holds no intrinsic monetary value.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">2. No Financial Profit</h2>
                    <p className="text-gray-300">
                        This application is NOT a high-yield investment program, lottery, or gambling service.
                        There are no guaranteed returns, prizes, or financial rewards for participating.
                        Any fees paid are non-refundable and go towards protocol maintenance and gas costs.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">3. Blockchain Risks</h2>
                    <p className="text-gray-300">
                        You acknowledge the risks associated with blockchain transactions, including but not limited to:
                        failed transactions, high gas fees, smart contract bugs, and loss of private keys.
                        We are not responsible for funds lost due to user error or network issues on the Base L2 network.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">4. Disclaimer</h2>
                    <p className="text-gray-300">
                        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
                    </p>
                </section>
            </div>
        </div>
    );
}
