
// Helper function to decode ugly Viem errors
export const parseError = (error: any) => {
    const msg = error?.message || "";

    if (msg.includes("User rejected") || msg.includes("denied transaction")) {
        return "Transaction cancelled.";
    }
    if (msg.includes("insufficient funds") || msg.includes("exceeds allowance")) {
        return "Not enough ETH for gas.";
    }
    // Catch your custom smart contract revert messages!
    if (msg.includes("Wait 12 hours") || msg.includes("Already GM'd")) {
        return "You already GM'd! Come back later.";
    }
    if (msg.includes("Streak broken") || msg.includes("Must restore")) {
        return "Your streak is broken. Restore it first!";
    }

    // Fallback for weird RPC errors
    console.error("Raw Error:", error); // Keep this so you can debug later
    return "Something went wrong. Please try again.";
};
