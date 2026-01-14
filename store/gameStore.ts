import { CHARADES_WORDS } from '@/data/charades';
import { getRandomMindSyncQuestion, getRandomMovie } from '@/data/game-modes';
import { getEffectiveTheme, getEffectiveUndercoverTheme, getThemeById, themes, undercoverCategories } from '@/data/themes';
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
    // Thief & Police specific
    isPolice?: boolean;
    isThief?: boolean;
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

    // Charades specific
    setNextRoundPlayerId: (id: string) => void;
    nextRoundPlayerId: string | null;

    // Theme and word
    selectTheme: (themeId: string) => void;
    addCustomWord: (word: string) => void;
    removeCustomWord: (word: string) => void;

    // Settings
    updateSettings: (settings: Partial<GameSettings>) => void;

    // Game flow
    startGame: () => void;
    continueRound: (newWord: boolean) => void;
    revealRole: (playerId: string) => void;
    nextReveal: () => void;
    startDiscussion: () => void;
    startVoting: () => void;
    castVote: (voterId: string, votedForId: string) => void;
    forceEndGame: (eliminatedPlayerId: string) => void;
    endGame: () => void;

    // Reset
    resetGame: () => void;
    resetTournament: () => void;
    resetToHome: () => void;

    // Theme refresh (first non-imposter player only)
    refreshTheme: () => void;
    calculateRoundScores: () => void;

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

    // Reset Flow
    queueNewTournament: () => void;
    // Used words tracking (to prevent repetition until tournament reset)
    usedWords: string[];

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
    gameWinner: null,
    lastEliminatedPlayerId: null,
    overallWinner: null,
    isNewTournamentPending: false,
    usedWords: [],
    nextRoundPlayerId: null,
};

// Smart Shuffle: Weighted random selection
const selectImposterIndices = (players: Player[], count: number, lastImposterIndices: number[] = []): number[] => {
    // 1. Calculate weights
    // Base weight = 100
    // Each previous imposter turn reduces weight by 20 (min 10)
    // Being imposter LAST turn reduces weight by 80%

    let candidates = players.map((p, index) => {
        let weight = Math.max(10, 100 - (p.imposterCount * 20));

        // Heavy penalty for back-to-back imposters
        if (lastImposterIndices.includes(index)) {
            weight = Math.floor(weight * 0.1);
        }

        return { index, weight };
    });

    const selected: number[] = [];

    for (let i = 0; i < count; i++) {
        // Calculate total weight of remaining candidates
        const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
        let random = Math.random() * totalWeight;

        // Select candidate
        let selectedIndex = -1;
        for (let j = 0; j < candidates.length; j++) {
            random -= candidates[j].weight;
            if (random <= 0) {
                selectedIndex = j;
                break;
            }
        }

        // Fallback for floating point errors
        if (selectedIndex === -1) selectedIndex = candidates.length - 1;

        const chosen = candidates[selectedIndex];
        selected.push(chosen.index);

        // Remove chosen from candidates for next iteration (if multiple imposters)
        candidates.splice(selectedIndex, 1);
    }

    return selected;
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
                    score: 0,
                    imposterCount: 0,
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

    setNextRoundPlayerId: (id: string) => {
        set({ nextRoundPlayerId: id });
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
        // Validating new tournament reset - PROACTIVELY reset before getting state
        if (get().isNewTournamentPending) {
            get().resetTournament();
            set({ isNewTournamentPending: false });
        }

        const state = get();
        const { players, gameMode, selectedThemeId, settings, customWords } = state;

        // Minimum player checks
        if (gameMode === 'directors-cut' || gameMode === 'time-bomb') {
            if (players.length < 2) return;
        } else {
            if (players.length < 3) return;
        }

        if (!gameMode) return;

        let gameData: GameData = null;
        let selectedWord: Word | null = null;

        // Select multiple imposters based on settings
        // Ensure at least 1 imposter even if custom count is low, but respect max of half players (unless 2 players, then 1 imposter)
        let imposterCount: number;
        if (gameMode === 'time-bomb') {
            imposterCount = 0;
        } else {
            const maxImposters = players.length === 2 ? 1 : Math.floor(players.length / 2);
            imposterCount = Math.max(1, Math.min(settings.imposterCount, maxImposters));
        }

        // SMART SHUFFLE: Use weighted selection
        // We know who was imposter last time from the players state before we update it
        // Check for last game data is tricky since we don't store "lastImposterId" explicitly, 
        // but we can infer it if we tracked it. For now, just using imposterCount history is a huge improvement.

        // Ideally we'd pass the previous round's imposter indices, but since we re-roll,
        // let's rely primarily on the persistent 'imposterCount' for fairness.
        // If needed, we can add 'wasImposterLastRound' to Player later.

        const specialIndices = selectImposterIndices(players, imposterCount);

        // Update imposter counts for the chosen ones
        const playersWithUpdatedCounts = players.map((p, i) => {
            if (specialIndices.includes(i)) {
                return { ...p, imposterCount: p.imposterCount + 1 };
            }
            return p;
        });

        // Update state with new counts immediately so it persists
        set({ players: playersWithUpdatedCounts });

        switch (gameMode) {
            case 'undercover-word': {
                // For undercover-word, we can use themes OR the new undercover words
                if (selectedThemeId && selectedThemeId !== 'undercover') {
                    if (selectedThemeId === 'custom') {
                        if (customWords.length === 0) return;
                        // Filter custom words
                        const available = customWords.filter(w => !state.usedWords.includes(w));
                        const pool = available.length > 0 ? available : customWords;

                        const randomCustomWord = pool[Math.floor(Math.random() * pool.length)];

                        // Add to used words
                        set(s => ({ usedWords: [...s.usedWords, randomCustomWord] }));

                        selectedWord = {
                            word: randomCustomWord,
                            hints: {
                                low: 'A custom word',
                                medium: 'A custom word from your list',
                                high: 'A custom word you added',
                            },
                        };
                    } else {
                        const theme = getEffectiveTheme(selectedThemeId);
                        if (!theme) return;

                        // Filter theme words
                        const available = theme.words.filter(w => !state.usedWords.includes(w.word));
                        const pool = available.length > 0 ? available : theme.words;

                        selectedWord = pool[Math.floor(Math.random() * pool.length)];

                        // Add to used words
                        if (selectedWord) {
                            set(s => ({ usedWords: [...s.usedWords, selectedWord!.word] }));
                        }
                    }

                    if (selectedWord) {
                        gameData = {
                            type: 'undercover-word',
                            data: {
                                crewmateWord: selectedWord.word,
                                imposterWord: 'IMPOSTER', // This is just a placeholder for Classic mode
                                category: 'General',
                                hints: selectedWord.hints
                            }
                        };
                    }
                } else {
                    // Fallback to random theme
                    const theme = getEffectiveTheme('general');
                    if (theme) {
                        // Filter theme words
                        const available = theme.words.filter(w => !state.usedWords.includes(w.word));
                        const pool = available.length > 0 ? available : theme.words;

                        selectedWord = pool[Math.floor(Math.random() * pool.length)];

                        // Add to used words
                        if (selectedWord) {
                            set(s => ({ usedWords: [...s.usedWords, selectedWord!.word] }));
                        }

                        if (selectedWord) {
                            gameData = {
                                type: 'undercover-word',
                                data: {
                                    crewmateWord: selectedWord.word,
                                    imposterWord: 'IMPOSTER',
                                    category: theme.name,
                                    hints: selectedWord.hints
                                }
                            };
                        }
                    }
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
                // UI: "Undercover" - Requires paired words
                if (!selectedThemeId || selectedThemeId === 'custom') return;
                const theme = getEffectiveUndercoverTheme(selectedThemeId);
                if (!theme || theme.pairs.length === 0) return;

                // Pick a random pair from the undercover theme
                const availablePairs = theme.pairs.filter(p => !state.usedWords.includes(p.crewmateWord));
                const pool = availablePairs.length > 0 ? availablePairs : theme.pairs;

                const randomPair = pool[Math.floor(Math.random() * pool.length)];

                // Add to used words
                set(s => ({ usedWords: [...s.usedWords, randomPair.crewmateWord] }));

                gameData = {
                    type: 'classic-imposter',
                    data: {
                        crewmateWord: randomPair.crewmateWord,
                        imposterWord: randomPair.imposterWord,
                        themeName: theme.name
                    },
                };

                selectedWord = {
                    word: randomPair.crewmateWord,
                    hints: { low: 'Related word', medium: 'Sibling word', high: 'Conceptually similar' }
                };
                break;
            }

            case 'time-bomb': {
                // Custom categories for Time Bomb
                const bombCategories = [
                    'Movie', 'Food', 'Game', 'Animal', 'Brand', 'Thing',
                    'Celebrity', 'Country', 'Song', 'City', 'Color'
                ];

                // Pick random category
                const category = bombCategories[Math.floor(Math.random() * bombCategories.length)];

                // Pick random letter A-Z (including X, Q, Z etc. as requested)
                const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

                let duration = settings.discussionTime;
                let hiddenTimer = false;

                // Handle Random Time Mode
                if (duration === -1) {
                    // Random duration between 20 and 90 seconds
                    duration = Math.floor(Math.random() * (90 - 20 + 1)) + 20;
                    hiddenTimer = true;
                }

                gameData = {
                    type: 'time-bomb',
                    data: {
                        category,
                        letter,
                        duration,
                        hiddenTimer
                    }
                };
                break;
            }

            case 'charades': {
                // Shuffle words from external data and limit to 20
                const shuffled = [...CHARADES_WORDS].sort(() => Math.random() - 0.5).slice(0, 20);
                // Sanitize duration: if not 30, default to 60. (Handles -1 from mystery mode)
                const charadesDuration = (settings.discussionTime === 30) ? 30 : 60;
                const targetPlayerId = state.nextRoundPlayerId || players[0].id; // Fallback to first player

                gameData = {
                    type: 'charades',
                    data: {
                        words: shuffled,
                        duration: charadesDuration,
                        selectedPlayerId: targetPlayerId
                    }
                };
                break;
            }

            case 'thief-police': {
                // Use undercover word pairs for thief-police mode
                const allThemes = undercoverCategories.flatMap(cat => cat.themes);
                const theme = allThemes[Math.floor(Math.random() * allThemes.length)];

                // Pick a random pair
                const availablePairs = theme.pairs.filter((p) => !state.usedWords.includes(p.crewmateWord));
                const pool = availablePairs.length > 0 ? availablePairs : theme.pairs;
                const randomPair = pool[Math.floor(Math.random() * pool.length)];

                // Add to used words
                set(s => ({ usedWords: [...s.usedWords, randomPair.crewmateWord] }));

                // Randomly select Police and Thief from different players
                const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
                const policePlayer = shuffledPlayers[0];
                const thiefPlayer = shuffledPlayers[1];

                gameData = {
                    type: 'thief-police',
                    data: {
                        policeWord: randomPair.crewmateWord,
                        thiefWord: randomPair.imposterWord,
                        category: theme.name,
                        policePlayerId: policePlayer.id,
                        thiefPlayerId: thiefPlayer.id
                    }
                };
                break;
            }
        }

        // Assign special roles
        const assignedPlayers = playersWithUpdatedCounts.map((player, index) => {
            let isSpecial = specialIndices.includes(index);

            // If Director is pre-selected
            if (gameMode === 'directors-cut' && state.directorId) {
                isSpecial = player.id === state.directorId;
            }

            return {
                ...player,
                isImposter: isSpecial,
                hasRevealed: false,
                isEliminated: false,
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
            gameWinner: null,
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
        let nextIndex = state.currentRevealIndex + 1;

        // Skip eliminated players
        while (nextIndex < state.players.length && state.players[nextIndex].isEliminated) {
            nextIndex++;
        }

        if (nextIndex >= state.players.length) {
            // All active players have revealed, move to discussion prep
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
        const players = state.players.map(p =>
            p.id === eliminatedPlayerId ? { ...p, isEliminated: true } : p
        );

        const activePlayers = players.filter(p => !p.isEliminated);
        const activeImposters = activePlayers.filter(p => p.isImposter);
        const activeCrewmates = activePlayers.filter(p => !p.isImposter);

        let gameWinner: 'crewmates' | 'imposters' | null = null;
        if (activeImposters.length === 0) {
            gameWinner = 'crewmates';
        } else if (activeCrewmates.length <= activeImposters.length) {
            gameWinner = 'imposters';
        }

        set({
            phase: 'results',
            players,
            impostersCaught: activeImposters.length < players.filter(p => p.isImposter).length,
            gameWinner,
            lastEliminatedPlayerId: eliminatedPlayerId,
        });

        // Award points
        get().calculateRoundScores();
    },

    endGame: () => {
        const state = get();
        const mostVoted = state.getMostVotedPlayer();

        if (!mostVoted) {
            set({ phase: 'results', gameWinner: null });
            return;
        }

        const players = state.players.map(p =>
            p.id === mostVoted.id ? { ...p, isEliminated: true } : p
        );

        const activePlayers = players.filter(p => !p.isEliminated);
        const activeImposters = activePlayers.filter(p => p.isImposter);
        const activeCrewmates = activePlayers.filter(p => !p.isImposter);

        let gameWinner: 'crewmates' | 'imposters' | null = null;
        if (activeImposters.length === 0) {
            gameWinner = 'crewmates';
        } else if (activeCrewmates.length <= activeImposters.length) {
            gameWinner = 'imposters';
        }

        set({
            phase: 'results',
            players,
            impostersCaught: activeImposters.length < players.filter(p => p.isImposter).length,
            gameWinner,
            lastEliminatedPlayerId: mostVoted.id,
        });

        // Award points
        get().calculateRoundScores();
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
            gameWinner: null,
            lastEliminatedPlayerId: null,
            overallWinner: null, // Reset overall winner status only
            players: state.players.map((p) => ({
                ...p,
                isImposter: false,
                hasRevealed: false,
                vote: undefined,
                answer: undefined,
                score: p.score, // Preserve score
                isEliminated: false,
            })),
        });
    },

    resetTournament: () => {
        const state = get();
        // Keep players but reset scores
        set({
            phase: 'setup',
            currentRevealIndex: 0,
            selectedWord: null,
            gameData: null,
            votes: {},
            impostersCaught: false,
            directorId: null,
            directorWinnerId: null,
            gameWinner: null,
            lastEliminatedPlayerId: null,
            overallWinner: null,
            players: state.players.map((p) => ({
                ...p,
                isImposter: false,
                hasRevealed: false,
                vote: undefined,
                answer: undefined,
                score: 0, // Reset score to 0
                isEliminated: false,
            })),
            usedWords: [], // Reset used words
        });
    },

    resetToHome: () => {
        set({ ...initialState, directorId: null, directorWinnerId: null, players: [], overallWinner: null, isNewTournamentPending: false, usedWords: [] });
    },

    queueNewTournament: () => {
        set({ isNewTournamentPending: true });
    },

    calculateRoundScores: () => {
        const state = get();
        const { gameMode, gameWinner, players, directorWinnerId, directorId, lastEliminatedPlayerId } = state;

        if (!gameWinner && gameMode !== 'directors-cut') return;

        const updatedPlayers = players.map(player => {
            let pointsToAdd = 0;

            switch (gameMode) {
                case 'undercover-word':
                case 'classic-imposter':
                    if (gameWinner === 'imposters' && player.isImposter) {
                        pointsToAdd = 3;
                    } else if (gameWinner === 'crewmates' && !player.isImposter && !player.isEliminated) {
                        pointsToAdd = 1;
                    }
                    break;

                case 'directors-cut':
                case 'time-bomb':
                    if (player.id !== lastEliminatedPlayerId) {
                        // Everyone who didn't lose gets 1 point
                        pointsToAdd = 1;
                    }
                    break;

                case 'mind-sync':
                    if (gameWinner === 'imposters' && player.isImposter) {
                        // Outlier won
                        pointsToAdd = 3;
                    } else if (gameWinner === 'crewmates' && !player.isImposter) {
                        // Majority won
                        pointsToAdd = 1;
                    }
                    break;
            }

            return { ...player, score: player.score + pointsToAdd };
        });

        // Check for overall winner (first to 10)
        const WINNING_SCORE = 10;
        const winner = updatedPlayers.find(p => p.score >= WINNING_SCORE);
        set({
            players: updatedPlayers,
            overallWinner: winner || null,
        });
    },

    continueRound: (newWord: boolean) => {
        const state = get();
        const { players, gameMode, selectedThemeId, settings, customWords, gameData: currentData } = state;

        let gameData = currentData;
        let selectedWord = state.selectedWord;

        if (newWord) {
            // Re-roll the word/data but KEEP same roles
            switch (gameMode) {
                case 'undercover-word': {
                    if (selectedThemeId && selectedThemeId !== 'undercover') {
                        if (selectedThemeId === 'custom') {
                            if (customWords.length > 0) {
                                const available = customWords.filter(w => !state.usedWords.includes(w));
                                const pool = available.length > 0 ? available : customWords;
                                const randomCustomWord = pool[Math.floor(Math.random() * pool.length)];
                                set(s => ({ usedWords: [...s.usedWords, randomCustomWord] }));

                                selectedWord = {
                                    word: randomCustomWord,
                                    hints: { low: 'A custom word', medium: 'A custom word from your list', high: 'A custom word you added' },
                                };
                            }
                        } else {
                            const theme = getThemeById(selectedThemeId!);
                            if (theme) {
                                const available = theme.words.filter(w => !state.usedWords.includes(w.word));
                                const pool = available.length > 0 ? available : theme.words;
                                const word = pool[Math.floor(Math.random() * pool.length)];

                                if (word) {
                                    selectedWord = word;
                                    set(s => ({ usedWords: [...s.usedWords, word.word] }));
                                }
                            }
                        }

                        if (selectedWord) {
                            gameData = {
                                type: 'undercover-word',
                                data: {
                                    crewmateWord: selectedWord.word,
                                    imposterWord: 'IMPOSTER',
                                    category: 'General',
                                    hints: selectedWord.hints
                                }
                            };
                        }
                    }
                    break;
                }
                case 'mind-sync': {
                    const question = getRandomMindSyncQuestion();
                    if (question) gameData = { type: 'mind-sync', data: question };
                    break;
                }
                case 'classic-imposter': {
                    const themeId = selectedThemeId || 'classic'; // fallback
                    const theme = getEffectiveUndercoverTheme(themeId);
                    if (theme && theme.pairs.length > 0) {
                        const availablePairs = theme.pairs.filter(p => !state.usedWords.includes(p.crewmateWord));
                        const pool = availablePairs.length > 0 ? availablePairs : theme.pairs;
                        const wordPair = pool[Math.floor(Math.random() * pool.length)];
                        set(s => ({ usedWords: [...s.usedWords, wordPair.crewmateWord] }));

                        gameData = {
                            type: 'classic-imposter',
                            data: {
                                crewmateWord: wordPair.crewmateWord,
                                imposterWord: wordPair.imposterWord,
                                themeName: theme.name
                            },
                        };
                        selectedWord = {
                            word: wordPair.crewmateWord,
                            hints: { low: 'Related word', medium: 'Sibling word', high: 'Conceptually similar' }
                        };
                    }
                    break;
                }
                case 'time-bomb': {
                    // Pick random theme from all themes
                    const theme = themes[Math.floor(Math.random() * themes.length)];
                    // Pick random letter A-Z
                    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

                    gameData = {
                        type: 'time-bomb',
                        data: {
                            category: theme.name,
                            letter,
                            duration: settings.discussionTime
                        }
                    };
                    break;
                }
            }
        }

        // Find first active player to start reveal
        const firstActiveIndex = players.findIndex(p => !p.isEliminated);

        set({
            phase: newWord ? 'reveal' : 'discussion',
            gameData,
            selectedWord,
            votes: {},
            gameWinner: null,
            lastEliminatedPlayerId: null,
            players: players.map(p => ({
                ...p,
                hasRevealed: false,
                vote: undefined,
                answer: undefined,
            })),
            currentRevealIndex: firstActiveIndex === -1 ? 0 : firstActiveIndex,
        });
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

        const firstActiveIdx = players.findIndex(p => !p.isEliminated);
        if (currentRevealIndex !== firstActiveIdx) return;
        if (gameMode === 'directors-cut') return;

        const firstActivePlayer = players[firstActiveIdx];
        if (!firstActivePlayer || firstActivePlayer.isImposter) return;

        let gameData: GameData = null;
        let selectedWord: Word | null = null;

        // Re-roll the game data with a NEW random selection
        switch (gameMode) {
            case 'undercover-word': {
                if (selectedThemeId && selectedThemeId !== 'undercover') {
                    if (selectedThemeId === 'custom') {
                        if (customWords.length === 0) return;
                        // Filter custom words
                        const available = customWords.filter(w => !state.usedWords.includes(w));
                        const pool = available.length > 0 ? available : customWords;
                        const randomCustomWord = pool[Math.floor(Math.random() * pool.length)];
                        set(s => ({ usedWords: [...s.usedWords, randomCustomWord] }));

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

                        // Filter theme words
                        const available = theme.words.filter(w => !state.usedWords.includes(w.word));
                        const pool = available.length > 0 ? available : theme.words;

                        selectedWord = pool[Math.floor(Math.random() * pool.length)];
                        if (selectedWord) {
                            set(s => ({ usedWords: [...s.usedWords, selectedWord!.word] }));
                        }
                    }

                    if (selectedWord) {
                        gameData = {
                            type: 'undercover-word',
                            data: {
                                crewmateWord: selectedWord.word,
                                imposterWord: 'IMPOSTER',
                                category: 'General',
                                hints: selectedWord.hints
                            }
                        };
                    }
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
                const theme = getEffectiveUndercoverTheme(selectedThemeId);
                if (!theme || theme.pairs.length === 0) return;

                const availablePairs = theme.pairs.filter(p => !state.usedWords.includes(p.crewmateWord));
                const pool = availablePairs.length > 0 ? availablePairs : theme.pairs;
                const randomPair = pool[Math.floor(Math.random() * pool.length)];
                set(s => ({ usedWords: [...s.usedWords, randomPair.crewmateWord] }));

                gameData = {
                    type: 'classic-imposter',
                    data: {
                        crewmateWord: randomPair.crewmateWord,
                        imposterWord: randomPair.imposterWord,
                        themeName: theme.name
                    },
                };

                selectedWord = {
                    word: randomPair.crewmateWord,
                    hints: { low: 'Related word', medium: 'Sibling word', high: 'Conceptually similar' }
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
        get().calculateRoundScores();
    },

    // Getters
    getCurrentPlayer: () => {
        const state = get();
        const { currentRevealIndex, players } = state;
        if (currentRevealIndex < 0 || currentRevealIndex >= players.length) return null;

        const player = players[currentRevealIndex];
        if (player.isEliminated) {
            // If the current index points to an eliminated player, find the next active one
            // This is a safety check as nextReveal/continueRound should handle this
            const nextActive = players.slice(currentRevealIndex).find(p => !p.isEliminated);
            return nextActive || null;
        }
        return player;
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
                // This is the "Classic Imposter" mode where imposter gets a hint
                if (gameData?.type === 'undercover-word') {
                    const { crewmateWord, hints } = gameData.data;
                    if (player.isImposter) {
                        if (settings.hintStrength === 'none') {
                            return { isImposter: true, word: null, hint: null };
                        }
                        const hint = hints[settings.hintStrength] ?? null;
                        return { isImposter: true, word: null, hint };
                    }
                    return { isImposter: false, word: crewmateWord, hint: null };
                }
                return { isImposter: false, word: null, hint: null };
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

            case 'thief-police': {
                if (gameData?.type !== 'thief-police') {
                    return { isImposter: false, word: null, hint: null };
                }
                const { policeWord, thiefWord, policePlayerId, thiefPlayerId } = gameData.data;

                if (player.id === policePlayerId) {
                    // Police gets the crewmate word and knows they are Police
                    return {
                        isImposter: false,
                        isPolice: true,
                        isThief: false,
                        word: policeWord,
                        hint: 'You are the POLICE. Find the Thief!',
                    };
                }
                if (player.id === thiefPlayerId) {
                    // Thief gets the different word
                    return {
                        isImposter: true,
                        isPolice: false,
                        isThief: true,
                        word: thiefWord,
                        hint: 'You are the THIEF. Blend in!',
                    };
                }
                // Civilians get the same word as Police
                return {
                    isImposter: false,
                    isPolice: false,
                    isThief: false,
                    word: policeWord,
                    hint: 'You are a CIVILIAN. Help the Police!',
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
