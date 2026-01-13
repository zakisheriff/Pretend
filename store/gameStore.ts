import { getRandomMindSyncQuestion, getRandomMovie, getRandomUndercoverWord } from '@/data/game-modes';
import { getRandomWord, getThemeById } from '@/data/themes';
import { DEFAULT_SETTINGS, GameData, GameMode, GameSettings, GameState, Player, Word } from '@/types/game';
import { create } from 'zustand';

// Extended player role info to support all game modes
interface PlayerRoleInfo {
    isImposter: boolean;
    word: string | null;
    hint: string | null;
    // Director's Cut specific
    movie?: string | null;
    genre?: string | null;
    movieHint?: string | null;
    isDirector?: boolean;
    // Mind Sync specific
    question?: string | null;
    isOutlier?: boolean;
}

interface GameStore extends GameState {
    // Director's Cut specific state
    directorId: string | null;
    directorWinnerId: string | null; // ID of the player who won (guessed correctly), or null if Director won

    // Player management
    addPlayer: (name: string) => void;
    removePlayer: (id: string) => void;
    updatePlayerName: (id: string, name: string) => void;
    reorderPlayers: (players: Player[]) => void;
    clearPlayers: () => void;

    // Game mode selection
    selectGameMode: (mode: GameMode) => void;

    // Theme and word
    selectTheme: (themeId: string) => void;
    addCustomWord: (word: string) => void;
    removeCustomWord: (word: string) => void;

    // Settings
    updateSettings: (settings: Partial<GameSettings>) => void;

    // Game flow
    startGame: () => void;
    revealRole: (playerId: string) => void;
    nextReveal: () => void;
    startDiscussion: () => void;
    startVoting: () => void;
    castVote: (voterId: string, votedForId: string) => void;
    forceEndGame: (eliminatedPlayerId: string) => void;
    endGame: () => void;

    // Reset
    resetGame: () => void;
    resetToHome: () => void;

    // Theme refresh (first non-imposter player only)
    refreshTheme: () => void;

    // Getters
    getCurrentPlayer: () => Player | null;
    getPlayerRole: (playerId: string) => PlayerRoleInfo;
    getVoteResults: () => { playerId: string; votes: number }[];
    getMostVotedPlayer: () => Player | null;
    getModeDisplayInfo: () => { specialRoleName: string; specialRoleIcon: string; normalRoleName: string };

    // Director Mode actions
    setDirector: (playerId: string) => void;
    setDirectorMovie: (movie: string, genre?: string, hint?: string) => void;
    setDirectorWinner: (winnerId: string | null) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialState: GameState = {
    gameMode: null,
    phase: 'setup',
    players: [],
    currentRevealIndex: 0,
    selectedThemeId: null,
    selectedWord: null,
    customWords: [],
    gameData: null,
    settings: DEFAULT_SETTINGS,
    // Director Mode defaults
    directorId: null,
    directorWinnerId: null,
    votes: {},
    impostersCaught: false,
};

export const useGameStore = create<GameStore>((set, get) => ({
    ...initialState,

    // Player management
    addPlayer: (name: string) => {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        set((state) => ({
            players: [
                ...state.players,
                {
                    id: generateId(),
                    name: trimmedName,
                    isImposter: false,
                    hasRevealed: false,
                },
            ],
        }));
    },

    removePlayer: (id: string) => {
        set((state) => ({
            players: state.players.filter((p) => p.id !== id),
        }));
    },

    updatePlayerName: (id: string, name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => ({
            players: state.players.map((p) => (p.id === id ? { ...p, name: trimmed } : p)),
        }));
    },

    reorderPlayers: (players: Player[]) => {
        // Create new object references to ensure proper re-render
        set({ players: players.map(p => ({ ...p })) });
    },
    clearPlayers: () => {
        set({ players: [] });
    },

    // Game mode selection
    selectGameMode: (mode: GameMode) => {
        set({ gameMode: mode });
    },

    // Theme and word
    selectTheme: (themeId: string) => {
        set({ selectedThemeId: themeId });
    },

    addCustomWord: (word: string) => {
        const trimmedWord = word.trim();
        if (!trimmedWord) return;

        set((state) => ({
            customWords: [...state.customWords, trimmedWord],
        }));
    },

    removeCustomWord: (word: string) => {
        set((state) => ({
            customWords: state.customWords.filter((w) => w !== word),
        }));
    },

    // Settings
    updateSettings: (newSettings: Partial<GameSettings>) => {
        set((state) => ({
            settings: { ...state.settings, ...newSettings },
        }));
    },

    // Game flow
    startGame: () => {
        const state = get();
        const { players, gameMode, selectedThemeId, settings, customWords } = state;

        if (players.length < 3) return;
        if (!gameMode) return;

        let gameData: GameData = null;
        let selectedWord: Word | null = null;

        // Select exactly 1 "imposter" (special role player)
        const specialPlayerIndex = Math.floor(Math.random() * players.length);

        switch (gameMode) {
            case 'undercover-word': {
                // For undercover-word, we can use themes OR the new undercover words
                if (selectedThemeId && selectedThemeId !== 'undercover') {
                    // Use traditional theme-based word (backward compatible)
                    if (selectedThemeId === 'custom') {
                        if (customWords.length === 0) return;
                        const randomCustomWord = customWords[Math.floor(Math.random() * customWords.length)];
                        selectedWord = {
                            word: randomCustomWord,
                            hints: {
                                low: 'A custom word',
                                medium: 'A custom word from your list',
                                high: 'A custom word you added',
                            },
                        };
                    } else {
                        const theme = getThemeById(selectedThemeId);
                        if (!theme) return;
                        selectedWord = getRandomWord(theme);
                    }
                } else {
                    // Use new undercover word pairs
                    const wordPair = getRandomUndercoverWord();
                    if (!wordPair) return;
                    gameData = { type: 'undercover-word', data: wordPair };
                    selectedWord = {
                        word: wordPair.mainWord,
                        hints: wordPair.hints,
                    };
                }
                break;
            }
            case 'directors-cut': {
                // If gameData is already set (manual movie), keep it. Otherwise random.
                if (state.gameData?.type === 'directors-cut') {
                    gameData = state.gameData;
                } else {
                    const movie = getRandomMovie();
                    if (!movie) return;
                    gameData = { type: 'directors-cut', data: movie };
                }
                break;
            }
            case 'mind-sync': {
                const question = getRandomMindSyncQuestion();
                if (!question) return;
                gameData = { type: 'mind-sync', data: question };
                break;
            }
            case 'classic-imposter': {
                // Requires a theme to be selected
                if (!selectedThemeId || selectedThemeId === 'custom') return;
                const theme = getThemeById(selectedThemeId);
                if (!theme || theme.words.length < 2) return;

                // Pick two different random words from the theme
                const shuffled = [...theme.words].sort(() => Math.random() - 0.5);
                const crewmateWord = shuffled[0].word;
                const imposterWord = shuffled[1].word;

                gameData = {
                    type: 'classic-imposter',
                    data: { crewmateWord, imposterWord, themeName: theme.name },
                };
                break;
            }
        }

        // Assign special role
        const assignedPlayers = players.map((player, index) => {
            let isSpecial = index === specialPlayerIndex;

            // If Director is pre-selected
            if (gameMode === 'directors-cut' && state.directorId) {
                isSpecial = player.id === state.directorId;
            }

            return {
                ...player,
                isImposter: isSpecial,
                hasRevealed: false,
                vote: undefined,
                answer: undefined,
            };
        });

        set({
            phase: 'reveal',
            players: assignedPlayers,
            selectedWord,
            gameData,
            currentRevealIndex: 0,
            votes: {},
            impostersCaught: false,
        });
    },

    revealRole: (playerId: string) => {
        set((state) => ({
            players: state.players.map((p) =>
                p.id === playerId ? { ...p, hasRevealed: true } : p
            ),
        }));
    },

    nextReveal: () => {
        const state = get();
        const nextIndex = state.currentRevealIndex + 1;

        if (nextIndex >= state.players.length) {
            // All players have revealed, move to discussion prep
            set({ phase: 'discussion' });
        } else {
            set({ currentRevealIndex: nextIndex });
        }
    },

    startDiscussion: () => {
        set({ phase: 'discussion' });
    },

    startVoting: () => {
        set({ phase: 'voting' });
    },

    castVote: (voterId: string, votedForId: string) => {
        set((state) => ({
            votes: { ...state.votes, [voterId]: votedForId },
            players: state.players.map((p) =>
                p.id === voterId ? { ...p, vote: votedForId } : p
            ),
        }));
    },

    forceEndGame: (eliminatedPlayerId: string) => {
        const state = get();
        const eliminatedPlayer = state.players.find((p) => p.id === eliminatedPlayerId);
        const impostersCaught = eliminatedPlayer?.isImposter ?? false;

        set({
            phase: 'results',
            impostersCaught,
        });
    },

    endGame: () => {
        const mostVoted = get().getMostVotedPlayer();
        const impostersCaught = mostVoted?.isImposter ?? false;

        set({
            phase: 'results',
            impostersCaught,
        });
    },

    // Reset
    resetGame: () => {
        const state = get();
        // Keep players, settings, and game mode - reset game state
        set({
            phase: 'setup',
            currentRevealIndex: 0,
            selectedWord: null,
            gameData: null,
            votes: {},
            impostersCaught: false,
            directorId: null,
            directorWinnerId: null,
            players: state.players.map((p) => ({
                ...p,
                isImposter: false,
                hasRevealed: false,
                vote: undefined,
                answer: undefined,
            })),
        });
    },

    resetToHome: () => {
        set({ ...initialState, directorId: null, directorWinnerId: null });
    },

    refreshTheme: () => {
        const state = get();
        const { players, gameMode, selectedThemeId, settings, customWords, currentRevealIndex } = state;

        // Only allow refresh if:
        // 1. We're in reveal phase
        // 2. This is the first player (index 0)
        // 3. The first player is NOT the imposter
        // 4. Not Director's Cut mode (movie is manually selected)
        if (state.phase !== 'reveal') return;
        if (currentRevealIndex !== 0) return;
        if (gameMode === 'directors-cut') return;

        const firstPlayer = players[0];
        if (!firstPlayer || firstPlayer.isImposter) return;

        let gameData: GameData = null;
        let selectedWord: Word | null = null;

        // Re-roll the game data with a NEW random selection
        switch (gameMode) {
            case 'undercover-word': {
                if (selectedThemeId && selectedThemeId !== 'undercover') {
                    if (selectedThemeId === 'custom') {
                        if (customWords.length === 0) return;
                        const randomCustomWord = customWords[Math.floor(Math.random() * customWords.length)];
                        selectedWord = {
                            word: randomCustomWord,
                            hints: {
                                low: 'A custom word',
                                medium: 'A custom word from your list',
                                high: 'A custom word you added',
                            },
                        };
                    } else {
                        const theme = getThemeById(selectedThemeId);
                        if (!theme) return;
                        selectedWord = getRandomWord(theme);
                    }
                } else {
                    const wordPair = getRandomUndercoverWord();
                    if (!wordPair) return;
                    gameData = { type: 'undercover-word', data: wordPair };
                    selectedWord = {
                        word: wordPair.mainWord,
                        hints: wordPair.hints,
                    };
                }
                break;
            }
            case 'mind-sync': {
                const question = getRandomMindSyncQuestion();
                if (!question) return;
                gameData = { type: 'mind-sync', data: question };
                break;
            }
            case 'classic-imposter': {
                if (!selectedThemeId || selectedThemeId === 'custom') return;
                const theme = getThemeById(selectedThemeId);
                if (!theme || theme.words.length < 2) return;

                const shuffled = [...theme.words].sort(() => Math.random() - 0.5);
                const crewmateWord = shuffled[0].word;
                const imposterWord = shuffled[1].word;

                gameData = {
                    type: 'classic-imposter',
                    data: { crewmateWord, imposterWord, themeName: theme.name },
                };
                break;
            }
        }

        // Re-roll imposter assignment starting from player at index 1 (skip first player)
        // This prevents abuse where someone keeps refreshing to become imposter
        const eligibleIndices = players.map((_, i) => i).filter(i => i > 0);
        const newSpecialIndex = eligibleIndices[Math.floor(Math.random() * eligibleIndices.length)];

        const reassignedPlayers = players.map((player, index) => ({
            ...player,
            isImposter: index === newSpecialIndex,
            hasRevealed: false,
        }));

        set({
            players: reassignedPlayers,
            selectedWord,
            gameData,
            currentRevealIndex: 1, // Start from second player to prevent cheating
        });
    },

    setDirector: (playerId: string) => {
        set({ directorId: playerId });
    },

    setDirectorMovie: (movie: string, genre: string = 'Custom', hint: string = 'Ask the Director') => {
        set({
            gameData: {
                type: 'directors-cut',
                data: { movie, genre, hint, year: new Date().getFullYear() }
            }
        });
    },

    setDirectorWinner: (winnerId: string | null) => {
        set({ directorWinnerId: winnerId, phase: 'results' });
    },

    // Getters
    getCurrentPlayer: () => {
        const state = get();
        if (state.currentRevealIndex >= state.players.length) return null;
        return state.players[state.currentRevealIndex];
    },

    getPlayerRole: (playerId: string): PlayerRoleInfo => {
        const state = get();
        const player = state.players.find((p) => p.id === playerId);

        if (!player) {
            return { isImposter: false, word: null, hint: null };
        }

        const { gameMode, gameData, selectedWord, settings } = state;

        switch (gameMode) {
            case 'undercover-word': {
                if (gameData?.type === 'undercover-word') {
                    // Using new undercover word pairs
                    const { mainWord, undercoverWord, hints } = gameData.data;
                    if (player.isImposter) {
                        // Undercover player gets the different word
                        return {
                            isImposter: true,
                            word: undercoverWord,
                            hint: null,
                        };
                    }
                    return {
                        isImposter: false,
                        word: mainWord,
                        hint: null,
                    };
                }
                // Fallback to traditional theme-based (imposter gets hint only)
                if (player.isImposter) {
                    if (settings.hintStrength === 'none') {
                        return { isImposter: true, word: null, hint: null };
                    }
                    const hint = selectedWord?.hints[settings.hintStrength] ?? null;
                    return { isImposter: true, word: null, hint };
                }
                return {
                    isImposter: false,
                    word: selectedWord?.word ?? null,
                    hint: null,
                };
            }

            case 'directors-cut': {
                if (gameData?.type !== 'directors-cut') {
                    return { isImposter: false, word: null, hint: null };
                }
                const { movie, genre, hint } = gameData.data;
                if (player.isImposter) {
                    // Director knows the movie
                    return {
                        isImposter: true,
                        isDirector: true,
                        word: null,
                        hint: null,
                        movie,
                        genre,
                        movieHint: null,
                    };
                }
                // Others get genre and hint
                return {
                    isImposter: false,
                    isDirector: false,
                    word: null,
                    hint: null,
                    movie: null,
                    genre,
                    movieHint: hint,
                };
            }

            case 'mind-sync': {
                if (gameData?.type !== 'mind-sync') {
                    return { isImposter: false, word: null, hint: null };
                }
                const { mainQuestion, outlierQuestion } = gameData.data;
                if (player.isImposter) {
                    // Outlier gets different question
                    return {
                        isImposter: true,
                        isOutlier: true,
                        word: null,
                        hint: null,
                        question: outlierQuestion,
                    };
                }
                return {
                    isImposter: false,
                    isOutlier: false,
                    word: null,
                    hint: null,
                    question: mainQuestion,
                };
            }

            case 'classic-imposter': {
                if (gameData?.type !== 'classic-imposter') {
                    return { isImposter: false, word: null, hint: null };
                }
                const { crewmateWord, imposterWord } = gameData.data;
                if (player.isImposter) {
                    return {
                        isImposter: true,
                        word: imposterWord,
                        hint: null,
                    };
                }
                return {
                    isImposter: false,
                    word: crewmateWord,
                    hint: null,
                };
            }

            default:
                return { isImposter: false, word: null, hint: null };
        }
    },

    getVoteResults: () => {
        const state = get();
        const voteCounts: Record<string, number> = {};

        Object.values(state.votes).forEach((votedForId) => {
            voteCounts[votedForId] = (voteCounts[votedForId] || 0) + 1;
        });

        return state.players.map((player) => ({
            playerId: player.id,
            votes: voteCounts[player.id] || 0,
        })).sort((a, b) => b.votes - a.votes);
    },

    getMostVotedPlayer: () => {
        const state = get();
        const results = get().getVoteResults();

        if (results.length === 0 || results[0].votes === 0) return null;

        return state.players.find((p) => p.id === results[0].playerId) ?? null;
    },

    getModeDisplayInfo: () => {
        const { gameMode } = get();
        switch (gameMode) {
            case 'undercover-word':
                // Classic Imposter - Role is shown (Imposter vs Crewmate)
                return { specialRoleName: 'Imposter', specialRoleIcon: 'person', normalRoleName: 'Crewmate' };
            case 'directors-cut':
                return { specialRoleName: 'Director', specialRoleIcon: 'videocam', normalRoleName: 'Viewer' };
            case 'mind-sync':
                // Mind Sync - Role is hidden during reveal, everyone is just "Player"
                return { specialRoleName: 'Outlier', specialRoleIcon: 'flash', normalRoleName: 'Player' };
            case 'classic-imposter':
                // Undercover - Role is hidden, everyone is just "Player" during reveal
                return { specialRoleName: 'Undercover', specialRoleIcon: 'search', normalRoleName: 'Player' };
            default:
                return { specialRoleName: 'Imposter', specialRoleIcon: 'person', normalRoleName: 'Crewmate' };
        }
    },
}));
