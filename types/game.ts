export type HintStrength = 'none' | 'low' | 'medium' | 'high';

// Game mode types
export type GameMode = 'undercover-word' | 'directors-cut' | 'mind-sync' | 'three-acts' | 'classic-imposter' | 'time-bomb' | 'charades' | 'thief-police' | 'wavelength';

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

export interface TimeBombData {
    variant: 'classic' | 'movies';
    category?: string;
    letter?: string;
    scenario?: string;
    duration: number;
    hiddenTimer?: boolean;
}

export interface CharadesData {
    words: string[];
    duration: number;
    selectedPlayerId: string;
    controlMode: 'gyro' | 'touch';
}

export interface ThiefPoliceData {
    policeWord: string;
    thiefWord: string;
    category: string;
    policePlayerId: string;
    thiefPlayerId: string;
}

export interface WavelengthSpectrum {
    left: string;
    right: string;
}

export interface WavelengthData {
    spectrum: WavelengthSpectrum;
    targetValue: number; // 0-100
    clueGiverId: string;
    clue: string | null;
    guesses: Record<string, number>; // Map of playerId -> guessValue (0-100)
    points: number | null;
}

export interface ThreeActsTeam {
    id: string;
    player1Id: string;
    player2Id: string;
    score: number;
    turnComplete: boolean;
    roundStats: {
        act1: { chosen: string; guessed: boolean; skipped: boolean; options: string[] };
        act2: { chosen: string; guessed: boolean; skipped: boolean; options: string[] };
        act3: { chosen: string; guessed: boolean; skipped: boolean; options: string[] };
    };
}

export interface ThreeActsData {
    teams: ThreeActsTeam[];
    currentTeamIndex: number;
    currentAct: 1 | 2 | 3;
    timerStarted: boolean;
    timeRemaining: number;
    actOptions: {
        act1: [string, string];
        act2: [string, string];
        act3: [string, string];
    };
    currentSelection: string | null;
}

// Union type for selected game data
export type GameData =
    | { type: 'undercover-word'; data: UndercoverWordPair }
    | { type: 'directors-cut'; data: DirectorsCutMovie }
    | { type: 'mind-sync'; data: MindSyncQuestion }
    | { type: 'classic-imposter'; data: ClassicImposterData }
    | { type: 'time-bomb'; data: TimeBombData }
    | { type: 'charades'; data: CharadesData }
    | { type: 'thief-police'; data: ThiefPoliceData }
    | { type: 'thief-police'; data: ThiefPoliceData }
    | { type: 'wavelength'; data: WavelengthData }
    | { type: 'three-acts'; data: ThreeActsData }
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
    soundEnabled: boolean;
    hapticsEnabled: boolean;
    charadesControl: 'gyro' | 'touch';
    charadesTime: number;
    timeBombVariant: 'classic' | 'movies';
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
    nextRoundPlayerId: string | null;
}

export const DEFAULT_SETTINGS: GameSettings = {
    imposterCount: 1,
    discussionTime: 300, // 5 minutes default
    hintStrength: 'low',
    randomizeTheme: false,
    differentHintsPerImposter: false,
    fakeHintForCrewmates: false,
    soundEnabled: true,
    hapticsEnabled: true,
    charadesControl: 'gyro',
    charadesTime: 60,
    timeBombVariant: 'classic',
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
    minPlayers: number;
    instructions: GameModeStep[];
}

export const GAME_MODES: GameModeInfo[] = [
    {
        id: 'three-acts',
        name: 'Three Acts',
        icon: 'film-outline',
        description: 'Three chances. One minute. Perfect sync.',
        tagline: 'Act, Quote, and Describe your way to victory!',
        minPlayers: 4,
        instructions: [
            { role: 'Pairs', icon: 'people-outline', desc: 'Team up! Players form pairs to compete.' },
            { role: '3 Acts', icon: 'layers-outline', desc: '1. One Word, 2. Quote, 3. Charades' },
            { role: 'Score', icon: 'trophy-outline', desc: 'Guess all 3 for max points!' },
        ],
    },
    {
        id: 'undercover-word',
        name: 'Classic Imposter',
        icon: 'people-outline',
        description: 'Imposter gets a clue, crewmates get the secret word',
        tagline: 'Find the imposter who only has a hint!',
        minPlayers: 3,
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
        minPlayers: 3,
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
        minPlayers: 2,
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
        minPlayers: 3,
        instructions: [
            { role: 'In Sync', icon: 'sync-outline', desc: 'Answer the question (+1 pt for majority win)' },
            { role: 'Outlier', icon: 'flash-outline', desc: 'Has a different question (+3 pts for win)!' },
        ],
    },
    {
        id: 'time-bomb',
        name: 'Time Bomb',
        icon: 'timer-outline',
        description: 'Pass the phone before the timer runs out!',
        tagline: 'Name a word in the category and pass it on!',
        minPlayers: 2,
        instructions: [
            { role: 'Everyone', icon: 'people-outline', desc: 'Answer the prompt (Category + Letter)' },
            { role: 'Loser', icon: 'skull-outline', desc: 'Holding the phone when time runs out (0 pts)' },
        ],
    },
    {
        id: 'charades',
        name: 'Charades',
        icon: 'phone-portrait-outline',
        description: 'Hold phone to forehead and guess the word!',
        tagline: 'Tilt DOWN for Correct, UP to Skip',
        minPlayers: 2,
        instructions: [
            { role: 'Holder', icon: 'happy-outline', desc: 'Phone on forehead. Guess based on acting!' },
            { role: 'Group', icon: 'people-outline', desc: 'Act out the word for the holder!' },
        ],
    },
    {
        id: 'thief-police',
        name: 'Thief & Police',
        icon: 'shield-outline',
        description: 'Police must catch the Thief hiding among civilians!',
        tagline: 'Can the Police spot the odd one out?',
        minPlayers: 4,
        instructions: [
            { role: 'Police', icon: 'shield-checkmark-outline', desc: 'Find who has a different word (+1 pt if caught)' },
            { role: 'Thief', icon: 'finger-print-outline', desc: 'Blend in with a DIFFERENT word (+2 pts if escaped)' },
            { role: 'Civilians', icon: 'people-outline', desc: 'Give clues, help Police find Thief (+1 pt if caught)' },
        ],
    },
    {
        id: 'wavelength',
        name: 'Wavelength',
        icon: 'pulse-outline', // Updated icon to something built-in likely to exist
        description: 'Think alike or drift apart.',
        tagline: 'Give the perfect clue and align the dial!',
        minPlayers: 2,
        instructions: [
            { role: 'Psychic', icon: 'eye-outline', desc: 'Sees the target & gives a clue.' },
            { role: 'Group', icon: 'people-outline', desc: 'Discuss and rotate the dial to the target!' },
            { role: 'Scoring', icon: 'trophy-outline', desc: 'Bullseye (5%) = 2pts, Close (15%) = 1pt' },
        ],
    },
];
