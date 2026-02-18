import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Daily GM',
        short_name: 'DailyGM',
        description: 'Say GM on Base every day to build your streak.',
        start_url: '/',
        display: 'standalone',
        background_color: '#000000',
        theme_color: '#0052FF',
        icons: [
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
