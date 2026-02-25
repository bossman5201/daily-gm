// Centralized contract configuration
// Update this address after deploying to Base Mainnet via NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local
export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`;

if (CONTRACT_ADDRESS === "0x0000000000000000000000000000000000000000") {
    console.warn('⚠️ CONTRACT_ADDRESS is not set! Add NEXT_PUBLIC_CONTRACT_ADDRESS to your .env.local and Vercel dashboard.');
}

export const DAILY_GM_ABI = [
    {
        inputs: [],
        name: "gm",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [],
        name: "restoreStreak",
        outputs: [],
        stateMutability: "payable",
        type: "function"
    },
    {
        inputs: [{ internalType: "address", name: "", type: "address" }],
        name: "userStats",
        outputs: [
            { internalType: "uint40", name: "lastGMTime", type: "uint40" },
            { internalType: "uint32", name: "currentStreak", type: "uint32" },
            { internalType: "uint32", name: "totalGMs", type: "uint32" },
            { internalType: "uint32", name: "longestStreak", type: "uint32" },
            { internalType: "uint32", name: "brokenStreak", type: "uint32" }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "protocolFee",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "restoreFee",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "totalGMCount",
        outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "owner",
        outputs: [{ internalType: "address", name: "", type: "address" }],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "withdraw",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            { internalType: "uint256", name: "_protocolFee", type: "uint256" },
            { internalType: "uint256", name: "_restoreFee", type: "uint256" }
        ],
        name: "setFees",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "pause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [],
        name: "unpause",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "streak", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        name: "GM",
        type: "event"
    },
    {
        anonymous: false,
        inputs: [
            { indexed: true, internalType: "address", name: "user", type: "address" },
            { indexed: false, internalType: "uint256", name: "streak", type: "uint256" },
            { indexed: false, internalType: "uint256", name: "timestamp", type: "uint256" }
        ],
        name: "StreakRestored",
        type: "event"
    },
    { inputs: [], name: "IncorrectFee", type: "error" },
    { inputs: [], name: "GMTooSoon", type: "error" },
    { inputs: [], name: "NoBrokenStreak", type: "error" },
    { inputs: [], name: "NoFunds", type: "error" },
    { inputs: [], name: "WithdrawFailed", type: "error" },
    { inputs: [], name: "FeeTooHigh", type: "error" },
    { inputs: [], name: "RenounceOwnershipDisabled", type: "error" }
] as const;
