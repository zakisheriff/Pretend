import { getRandomWord, getThemeById } from '@/data/themes';
import { DEFAULT_SETTINGS, GameSettings, GameState, Player, Word } from '@/types/game';
import { create } from 'zustand';

interface GameStore extends GameState {
    // Player management
    addPlayer: (name: string) => void;
    removePlayer: (id: string) => void;
    updatePlayerName: (id: string, name: string) => void;
    clearPlayers: () => void;

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
    endGame: () => void;

    // Reset
    resetGame: () => void;
    resetToHome: () => void;

    // Getters
    getCurrentPlayer: () => Player | null;
    getPlayerRole: (playerId: string) => { isImposter: boolean; word: string | null; hint: string | null };
    getVoteResults: () => { playerId: string; votes: number }[];
    getMostVotedPlayer: () => Player | null;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const initialState: GameState = {
    phase: 'setup',
    players: [],
    currentRevealIndex: 0,
    selectedThemeId: null,
    selectedWord: null,
    customWords: [],
    settings: DEFAULT_SETTINGS,
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

    clearPlayers: () => {
        set({ players: [] });
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
        const { players, selectedThemeId, settings, customWords } = state;

        if (players.length < 3) return;
        if (!selectedThemeId) return;

        // Get the theme and select a random word
        let selectedWord: Word | null = null;

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

        if (!selectedWord) return;

        // Keep players in their original order, but randomly select imposters
        const imposterCount = Math.min(settings.imposterCount, Math.floor(players.length / 2));

        // Create array of indices and shuffle to randomly select imposter indices
        const playerIndices = players.map((_, index) => index);
        const shuffledIndices = [...playerIndices].sort(() => Math.random() - 0.5);
        const imposterIndices = new Set(shuffledIndices.slice(0, imposterCount));

        // Assign imposter role randomly while keeping original order
        const assignedPlayers = players.map((player, index) => ({
            ...player,
            isImposter: imposterIndices.has(index),
            hasRevealed: false,
            vote: undefined,
        }));

        set({
            phase: 'reveal',
            players: assignedPlayers,
            selectedWord,
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

    endGame: () => {
        const state = get();
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
        // Keep players and settings, reset game state
        set({
            phase: 'setup',
            currentRevealIndex: 0,
            selectedWord: null,
            votes: {},
            impostersCaught: false,
            players: state.players.map((p) => ({
                ...p,
                isImposter: false,
                hasRevealed: false,
                vote: undefined,
            })),
        });
    },

    resetToHome: () => {
        set(initialState);
    },

    // Getters
    getCurrentPlayer: () => {
        const state = get();
        if (state.currentRevealIndex >= state.players.length) return null;
        return state.players[state.currentRevealIndex];
    },

    getPlayerRole: (playerId: string) => {
        const state = get();
        const player = state.players.find((p) => p.id === playerId);

        if (!player) {
            return { isImposter: false, word: null, hint: null };
        }

        if (player.isImposter) {
            if (state.settings.hintStrength === 'none') {
                return { isImposter: true, word: null, hint: null };
            }
            const hint = state.selectedWord?.hints[state.settings.hintStrength] ?? null;
            return { isImposter: true, word: null, hint };
        }

        return {
            isImposter: false,
            word: state.selectedWord?.word ?? null,
            hint: null,
        };
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
}));
