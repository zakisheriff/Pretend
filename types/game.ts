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

export interface UndercoverPair {
    crewmateWord: string;
    imposterWord: string;
    category?: string;
}

export interface UndercoverTheme {
    id: string;
    name: string;
    icon: string;
    pairs: UndercoverPair[];
}

export interface Theme {
    id: string;
    name: string;
    icon: string;
    words: Word[];
}

export interface ThemeCategory {
    id: string;
    name: string;
    icon: string;
    themes: Theme[];
}

export interface UndercoverCategory {
    id: string;
    name: string;
    icon: string;
    themes: UndercoverTheme[];
}

// Mode-specific data structures
export interface UndercoverWordPair {
    crewmateWord: string;
    imposterWord: string;
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
    isEliminated?: boolean; // For "Among Us" style multi-round logic
    imposterCount: number; // For "Smart Shuffle" logic to prevent streaks
    score: number;
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
    directorId: string | null;
    directorWinnerId: string | null;
    gameWinner: 'crewmates' | 'imposters' | null;
    lastEliminatedPlayerId: string | null;
    overallWinner: Player | null;
    isNewTournamentPending: boolean;
    usedWords: string[];
}

export const DEFAULT_SETTINGS: GameSettings = {
    imposterCount: 1,
    discussionTime: 300, // 5 minutes default
    hintStrength: 'medium',
    randomizeTheme: false,
    differentHintsPerImposter: false,
    fakeHintForCrewmates: false,
};

export interface GameModeStep {
    role: string;
    desc: string;
    icon: string;
}

export interface GameModeInfo {
    id: GameMode;
    name: string;
    icon: string;
    description: string;
    tagline: string;
    instructions: GameModeStep[];
}

export const GAME_MODES: GameModeInfo[] = [
    {
        id: 'undercover-word',
        name: 'Classic Imposter',
        icon: 'people-outline',
        description: 'Imposter gets a clue, crewmates get the secret word',
        tagline: 'Find the imposter who only has a hint!',
        instructions: [
            { role: 'Crewmates', icon: 'eye-outline', desc: 'See the SECRET WORD (+1 pt for survivors)' },
            { role: 'Imposter', icon: 'skull-outline', desc: 'Gets a CLUE - fake it and blend in! (+3 pts for win)' },
        ],
    },
    {
        id: 'classic-imposter',
        name: 'Undercover',
        icon: 'search-outline',
        description: 'Everyone gets a word - one person has a different one',
        tagline: 'Find who has a different word without revealing yours!',
        instructions: [
            { role: 'Everyone', icon: 'person-outline', desc: 'Players get a word (+1 pt for surviving crew)' },
            { role: 'Undercover', icon: 'help-outline', desc: 'Has a DIFFERENT word (+3 pts for win)!' },
        ],
    },
    {
        id: 'directors-cut',
        name: "Director's Cut",
        icon: 'videocam-outline',
        description: 'One Director knows the movie, others only get hints',
        tagline: 'Guess the movie through yes/no questions',
        instructions: [
            { role: 'Director', icon: 'film-outline', desc: 'Knows the MOVIE (+2 pts if no one guesses)' },
            { role: 'Viewers', icon: 'eye-outline', desc: 'Ask questions to guess the movie (+2 pts for correct guess)' },
        ],
    },
    {
        id: 'mind-sync',
        name: 'Mind Sync',
        icon: 'git-compare-outline',
        description: 'One player answers a slightly different question',
        tagline: 'Find who is out of sync',
        instructions: [
            { role: 'In Sync', icon: 'sync-outline', desc: 'Answer the question (+1 pt for majority win)' },
            { role: 'Outlier', icon: 'flash-outline', desc: 'Has a different question (+3 pts for win)!' },
        ],
    },
];
