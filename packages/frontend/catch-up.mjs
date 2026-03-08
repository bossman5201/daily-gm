import fetch from 'node-fetch';

const CRON_SECRET = 'd3d9360d670c5d14b1e226b7a3aee04d91e7bd04401fefb15c59cbb93753166d';

async function catchUp() {
    console.log('🔄 Starting Catch-Up Indexer Loop...');

    while (true) {
        try {
            const res = await fetch('https://daily-gm-zeta.vercel.app/api/index-gms', {
                headers: {
                    'Authorization': `Bearer ${CRON_SECRET}`
                }
            });

            if (!res.ok) {
                console.error('❌ Error hitting indexer local API:', res.status, await res.text());
                break;
            }

            const data = await res.json();
            console.log('✅ Block progress:', data);

            // If it returns "Already up to date", break the loop
            if (data.message === 'Already up to date') {
                console.log('🎉 Completely caught up!');
                break;
            }
        } catch (err) {
            console.error('❌ Request failed:', err.message);
            break;
        }

        // Wait 1 second before requesting next chunk
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

catchUp();
