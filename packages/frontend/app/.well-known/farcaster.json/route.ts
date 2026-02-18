import { NextResponse } from 'next/server';

export async function GET() {
    const URL = process.env.NEXT_PUBLIC_URL || 'https://daily-gm-zeta.vercel.app';

    return NextResponse.json({
        accountAssociation: {
            header: 'eyJmaWQiOi0xLCJ0eXBlIjoiYXV0aCIsImtleSI6IjB4YmQxNGI2NUU5YzZFNzY3RjAyRDE5MDA4OTQyNjE3MzVGNWY0OEE1NyJ9',
            payload: 'eyJkb21haW4iOiJkYWlseS1nbS16ZXRhLnZlcmNlbC5hcHAifQ',
            signature: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5LV86av2Au_qMcROrjClQkKBTdNaysGJG8hHAVrcb7h0kYw_tmrS1ZjyXZok3K4NN-eKEFCrMmtilll_P3UadgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAl8ZgIay2xclZzG8RWZzuWvO8j9R0fus3XxDee9lRlVy8dAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACKeyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoielRsMzZ0TnBlRmItcFpIbGRoQUZ5cndvM3dFdGJZbnRLZWxOcW53QVo2cyIsIm9yaWdpbiI6Imh0dHBzOi8va2V5cy5jb2luYmFzZS5jb20iLCJjcm9zc09yaWdpbiI6ZmFsc2V9AAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
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
            screenshotUrls: [`${URL}/screenshot1.png`],
            noindex: false,
        },
    });
}
