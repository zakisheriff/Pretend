export type HintStrength = 'none' | 'low' | 'medium' | 'high';

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

export interface Player {
    id: string;
    name: string;
    isImposter: boolean;
    hasRevealed: boolean;
    vote?: string; // Player ID they voted for
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
    // Game phase
    phase: 'setup' | 'reveal' | 'discussion' | 'voting' | 'results';

    // Players
    players: Player[];
    currentRevealIndex: number;

    // Theme and word
    selectedThemeId: string | null;
    selectedWord: Word | null;
    customWords: string[];

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
    hintStrength: 'medium',
    randomizeTheme: false,
    differentHintsPerImposter: false,
    fakeHintForCrewmates: false,
};
