import { DirectorsCutMovie, MindSyncQuestion, UndercoverWordPair } from '@/types/game';

import directorsCut from './modes/directors-cut.json';
import mindSync from './modes/mind-sync.json';
import undercoverWords from './modes/undercover-words.json';

export const getRandomUndercoverWord = (): UndercoverWordPair | null => {
    if (undercoverWords.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * undercoverWords.length);
    return undercoverWords[randomIndex] as UndercoverWordPair;
};

export const getRandomMovie = (): DirectorsCutMovie | null => {
    if (directorsCut.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * directorsCut.length);
    return directorsCut[randomIndex] as DirectorsCutMovie;
};

export const getRandomMindSyncQuestion = (): MindSyncQuestion | null => {
    if (mindSync.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * mindSync.length);
    return mindSync[randomIndex] as MindSyncQuestion;
};

export { directorsCut, mindSync, undercoverWords };

