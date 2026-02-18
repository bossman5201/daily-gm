import { NextResponse } from 'next/server';

export async function GET() {
    const URL = process.env.NEXT_PUBLIC_URL || 'https://daily-gm-zeta.vercel.app';

    return NextResponse.json({
        accountAssociation: {
            header: '',      // Fill after generating via Warpcast or base.dev
            payload: '',
            signature: '',
        },
        miniapp: {
            version: '1',
            name: 'Daily GM',
            homeUrl: URL,
            iconUrl: `${URL}/icon.png`,
            splashImageUrl: `${URL}/splash.png`,
            splashBackgroundColor: '#000000',
            subtitle: 'Say GM. Build Streaks.',
            description: 'Say GM on Base every day to build your streak. Earn rewards for consistency.',
            primaryCategory: 'social',
            tags: ['gm', 'streak', 'daily', 'base', 'onchain'],
            heroImageUrl: `${URL}/splash.png`,
            tagline: 'GM every day',
            ogTitle: 'Daily GM',
            ogDescription: 'Say GM on Base every day to build your streak.',
            ogImageUrl: `${URL}/splash.png`,
            noindex: false,
        },
    });
}
