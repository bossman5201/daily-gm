export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-black text-white p-8 font-sans">
            <div className="max-w-2xl mx-auto space-y-6">
                <h1 className="text-3xl font-bold text-[#0052FF]">Privacy Policy</h1>
                <p className="text-sm text-gray-400">Last Updated: February 2026</p>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">1. Data Collection</h2>
                    <p className="text-gray-300">
                        We do not collect personal identifying information (PII) such as proper names, emails, or phone numbers.
                        We collect public blockchain data (wallet addresses, transaction history) and basic usage metrics (IP address for rate limiting) to maintain the service.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">2. On-Chain Data</h2>
                    <p className="text-gray-300">
                        Please be aware that your transactions and wallet address are public information on the Base blockchain.
                        We cannot "delete" this data as it is immutable on the blockchain.
                    </p>
                </section>

                <section className="space-y-2">
                    <h2 className="text-xl font-bold">3. Third-Party Services</h2>
                    <p className="text-gray-300">
                        We use Supabase for data indexing and RPC providers (like Alchemy or Base Public RPC) to interact with the blockchain.
                        These services may collect metadata about your requests in accordance with their own privacy policies.
                    </p>
                </section>
            </div>
        </div>
    );
}
