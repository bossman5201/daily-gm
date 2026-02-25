// Track the currently playing audio to prevent overlap
let currentAudio: HTMLAudioElement | null = null;

export const playSound = (type: 'success' | 'click' | 'error') => {
    try {
        // Stop currently playing sound
        if (currentAudio) {
            currentAudio.pause();
            currentAudio.currentTime = 0;
        }

        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.volume = 0.5;
        currentAudio = audio;

        // Clean up reference when done
        audio.onended = () => {
            if (currentAudio === audio) {
                currentAudio = null;
            }
        };

        audio.play().catch(e => console.log('Audio play failed (user interaction needed or file missing):', e));
    } catch (e) {
        console.error('Audio initialization failed', e);
    }
};
