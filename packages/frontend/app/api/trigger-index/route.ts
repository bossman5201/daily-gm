import { NextResponse } from 'next/server';

export async function POST() {
    try {
        const cronSecret = process.env.CRON_SECRET;
        const url = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

        // Fire and forget the internal indexer 
        // We do it asynchronously without awaiting to let the user's request finish instantly
        fetch(`${url}/api/index-gms`, {
            headers: { Authorization: `Bearer ${cronSecret}` }
        }).catch(err => console.error("Trigger index background fetch failed:", err));

        return NextResponse.json({ success: true, message: "Indexing triggered securely in background" });
    } catch (error) {
        return NextResponse.json({ error: "Failed to trigger index" }, { status: 500 });
    }
}
