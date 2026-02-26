
// Helper function to decode ugly Viem errors
export const parseError = (error: any) => {
    const msg = error?.message || "";

    if (msg.includes("User rejected") || msg.includes("denied transaction")) {
        return "Transaction cancelled.";
    }
    if (msg.includes("insufficient funds") || msg.includes("exceeds allowance")) {
        return "Not enough ETH for gas.";
    }
    // Match actual contract custom errors (Viem includes error name in message)
    if (msg.includes("GMTooSoon")) {
        return "You already GM'd! Come back in 20 hours.";
    }
    if (msg.includes("IncorrectFee")) {
        return "Wrong fee amount. Please refresh the page.";
    }
    if (msg.includes("NoBrokenStreak")) {
        return "No broken streak to restore.";
    }

    // Fallback for weird RPC errors
    console.error("Raw Error:", error); // Keep this so you can debug later
    return "Something went wrong. Please try again.";
};
