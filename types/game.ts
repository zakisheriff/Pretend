export type HintStrength = 'none' | 'low' | 'medium' | 'high';

// Game mode types
export type GameMode = 'undercover-word' | 'directors-cut' | 'mind-sync' | 'classic-imposter';

export interface WordHints {
    low: string;
    medium: string;
    high: string;
}

export interface Word {
    word: string;
    hints: WordHints;
}

export interface Theme {
    id: string;
    name: string;
    icon: string;
    words: Word[];
}

// Mode-specific data structures
export interface UndercoverWordPair {
    mainWord: string;
    undercoverWord: string;
    category: string;
    hints: WordHints;
}

export interface DirectorsCutMovie {
    movie: string;
    genre: string;
    year: number;
    hint: string; // vague clue for non-directors
}

export interface MindSyncQuestion {
    mainQuestion: string;
    outlierQuestion: string;
    category: string;
}

export interface ClassicImposterData {
    crewmateWord: string;
    imposterWord: string;
    themeName: string;
}

// Union type for selected game data
export type GameData =
    | { type: 'undercover-word'; data: UndercoverWordPair }
    | { type: 'directors-cut'; data: DirectorsCutMovie }
    | { type: 'mind-sync'; data: MindSyncQuestion }
    | { type: 'classic-imposter'; data: ClassicImposterData }
    | null;

export interface Player {
    id: string;
    name: string;
    isImposter: boolean; // true for: undercover player, director, outlier
    hasRevealed: boolean;
    vote?: string; // Player ID they voted for
    answer?: string; // For Mind Sync: player's secret answer
}

export interface GameSettings {
    imposterCount: number;
    discussionTime: number; // in seconds
    hintStrength: HintStrength;
    randomizeTheme: boolean;
    differentHintsPerImposter: boolean;
    fakeHintForCrewmates: boolean;
}

export interface GameState {
    // Game mode
    gameMode: GameMode | null;

    // Game phase
    phase: 'setup' | 'reveal' | 'discussion' | 'voting' | 'results';

    // Players
    players: Player[];
    currentRevealIndex: number;

    // Theme and word (for backward compatibility with undercover-word mode)
    selectedThemeId: string | null;
    selectedWord: Word | null;
    customWords: string[];

    // Mode-specific game data
    gameData: GameData;

    // Settings
    settings: GameSettings;

    // Voting
    votes: Record<string, string>; // voterId -> votedForId

    // Results
    impostersCaught: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
    imposterCount: 1,
    discussionTime: 120, // 2 minutes
    hintStrength: 'low',
    randomizeTheme: false,
    differentHintsPerImposter: false,
    fakeHintForCrewmates: false,
};

// Game mode metadata
export interface GameModeInfo {
    id: GameMode;
    name: string;
    icon: string;
    description: string;
    tagline: string;
}

export const GAME_MODES: GameModeInfo[] = [
    {
        id: 'undercover-word',
        name: 'Classic Imposter',
        icon: 'people-outline',
        description: 'Imposter gets a clue, crewmates get the secret word',
        tagline: 'Find the imposter who only has a hint!',
    },
    {
        id: 'directors-cut',
        name: "Director's Cut",
        icon: 'videocam-outline',
        description: 'One Director knows the movie, others only get hints',
        tagline: 'Guess the movie through yes/no questions',
    },
    {
        id: 'mind-sync',
        name: 'Mind Sync',
        icon: 'git-compare-outline',
        description: 'One player answers a slightly different question',
        tagline: 'Find who is out of sync',
    },
    {
        id: 'classic-imposter',
        name: 'Undercover',
        icon: 'search-outline',
        description: 'Everyone gets a word - one person has a different one',
        tagline: 'Find who has a different word without revealing yours!',
    },
];
