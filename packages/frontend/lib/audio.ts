export const playSound = (type: 'success' | 'click' | 'error') => {
    try {
        const audio = new Audio(`/sounds/${type}.mp3`);
        audio.volume = 0.5;
        audio.play().catch(e => console.log('Audio play failed (user interaction needed or file missing):', e));
    } catch (e) {
        console.error('Audio initialization failed', e);
    }
};
