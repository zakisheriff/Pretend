import words from './pictionary-words.json';

export const getRandomWords = (count: number = 3): string[] => {
    const shuffled = [...words].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};
