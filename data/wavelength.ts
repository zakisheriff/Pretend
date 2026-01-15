import { WavelengthSpectrum } from '@/types/game';

export const WAVELENGTH_SPECTRUMS: WavelengthSpectrum[] = [
    { left: 'Hot', right: 'Cold' },
    { left: 'Overrated', right: 'Underrated' },
    { left: 'Ethical', right: 'Unethical' },
    { left: 'Popular', right: 'Unpopular' },
    { left: 'Serious', right: 'Funny' },
    { left: 'Easy', right: 'Hard' },
    { left: 'Safe', right: 'Risky' },
    { left: 'Useless', right: 'Useful' },
    { left: 'Bad Actor', right: 'Good Actor' },
    { left: 'Temporary', right: 'Permanent' },
    { left: 'Tastes Bad', right: 'Tastes Good' },
    { left: 'Cheap', right: 'Expensive' },
    { left: 'Rough', right: 'Smooth' },
    { left: 'Nature', right: 'Nurture' },
    { left: 'Scary', right: 'Not Scary' },
    { left: 'Hero', right: 'Villain' },
    { left: 'Happens Slowly', right: 'Happens Suddenly' },
    { left: 'Job', right: 'Career' },
    { left: 'Loved', right: 'Hated' },
    { left: 'The Light Side', right: 'The Dark Side' },
    { left: 'Mean', right: 'Nice' },
    { left: 'Order', right: 'Chaos' },
    { left: 'Conservative', right: 'Liberal' },
    { left: 'Soft', right: 'Hard' },
    { left: 'Movie', right: 'Film' },
    { left: 'Ugly', right: 'Beautiful' },
    { left: 'Local', right: 'Global' },
    { left: 'Human', right: 'Animal' },
    { left: 'Introvert', right: 'Extrovert' },
    { left: 'Book', right: 'Movie' },
    { left: 'Better Hot', right: 'Better Cold' },
    { left: 'Start', right: 'Stop' },
    { left: 'Smart', right: 'Stupid' },
    { left: 'Old', right: 'New' },
    { left: 'Wet', right: 'Dry' },
    { left: 'Loud', right: 'Quiet' },
    { left: 'Rare', right: 'Common' },
    { left: 'Public', right: 'Private' },
    { left: 'Work', right: 'Play' },
    { left: 'Love', right: 'Lust' },
    { left: 'For Kids', right: 'For Adults' },
    { left: 'Fantasy', right: 'Sci-Fi' },
    { left: 'Messy', right: 'Clean' },
    { left: 'Useless', right: 'Useful' },
    { left: 'Low Calorie', right: 'High Calorie' },
    { left: 'Straight', right: 'Curvy' },
    { left: 'Normal', right: 'Weird' },
    { left: 'Good Pizza Topping', right: 'Bad Pizza Topping' },
    { left: 'Mature', right: 'Immature' },
    { left: 'Underrated Film', right: 'Overrated Film' },
    { left: 'Good Habit', right: 'Bad Habit' }
];

export const getRandomSpectrum = (usedSpectrums: string[] = []): WavelengthSpectrum => {
    // Basic filter for now, can be improved to be smarter like charades
    const available = WAVELENGTH_SPECTRUMS.filter(s =>
        !usedSpectrums.includes(s.left + s.right)
    );

    if (available.length === 0) {
        // Reset if all used
        const random = WAVELENGTH_SPECTRUMS[Math.floor(Math.random() * WAVELENGTH_SPECTRUMS.length)];
        return random;
    }

    return available[Math.floor(Math.random() * available.length)];
};
