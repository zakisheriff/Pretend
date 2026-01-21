import { CHARADES_WORDS } from '@/data/charades';
import { directorsCut, getRandomMindSyncQuestion, mindSync } from '@/data/game-modes';
import { getEffectiveTheme, getEffectiveUndercoverTheme, getThemeById, themes } from '@/data/themes';
import thiefPoliceWords from '@/data/thief-police.json';
import { getRandomSpectrum } from '@/data/wavelength';
import { DEFAULT_SETTINGS, DirectorsCutMovie, GameData, GameMode, GameSettings, GameState, MindSyncQuestion, Player, ThreeActsData, ThreeActsTeam, Word } from '@/types/game';
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
    updatePlayerScore: (id: string, pointsToAdd: number) => void;
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

    // Time Bomb Reroll
    // Time Bomb Reroll
    refreshTimeBombData: () => void;


    // Wavelength Actions
    // Wavelength Actions
    submitWavelengthClue: (clue: string) => void;
    submitWavelengthGuess: (playerId: string, value: number) => void;
    revealWavelengthResult: () => void;

    // Three Acts Actions
    startThreeActsGame: (teams: ThreeActsTeam[]) => void;
    startThreeActsTurn: () => void;
    threeActsSelectOption: (option: string) => void;
    threeActsAction: (action: 'correct' | 'skip') => void;
    nextThreeActsTeam: () => void;
    setLastStarterId: (id: string) => void;
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
    lastStarterId: null,
};

// Smart Shuffle: Weighted random selection
// Smart Shuffle: Weighted random selection
const selectImposterIndices = (players: Player[], count: number, lastImposterIndices: number[] = []): number[] => {
    // 0. Strict Hardening: Filter out players who have been imposter 2+ times in a row
    // mapped to original index
    let eligiblePlayers = players.map((p, index) => ({ p, index }));
    const nonConsecutiveCandidates = eligiblePlayers.filter(item => item.p.consecutiveImposterCount < 2);

    // Safety valve: If everyone has been imposter 2+ times in a row (unlikely but possible in small groups),
    // or if we don't have enough candidates for the requested count,
    // fallback to everyone.
    let pool = nonConsecutiveCandidates.length >= count ? nonConsecutiveCandidates : eligiblePlayers;

    // 1. Calculate weights
    // Base weight = 100
    // Each previous imposter turn (total count) reduces weight by 20 (min 10)

    // Modern Fisher-Yates shuffle for the candidates first to remove any index-based bias
    let candidates = pool.map((item) => {
        let weight = Math.max(10, 100 - (item.p.imposterCount * 20));
        return { index: item.index, weight }; // Keep original index
    });

    // Shuffle candidates array
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

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
                    consecutiveImposterCount: 0,
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
    updatePlayerScore: (id: string, pointsToAdd: number) => {
        set((state) => ({
            players: state.players.map(p =>
                p.id === id ? { ...p, score: p.score + pointsToAdd } : p
            )
        }));
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
    setLastStarterId: (id: string) => {
        set({ lastStarterId: id });
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
        if (gameMode === 'directors-cut' || gameMode === 'time-bomb' || gameMode === 'charades' || gameMode === 'wavelength') {
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
        } else if (gameMode === 'wavelength') {
            imposterCount = 1; // Always 1 Psychic
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

        let specialIndices = selectImposterIndices(players, imposterCount);

        // Update imposter counts for the chosen ones
        const playersWithUpdatedCounts = players.map((p, i) => {
            if (specialIndices.includes(i)) {
                return { ...p, imposterCount: p.imposterCount + 1, consecutiveImposterCount: p.consecutiveImposterCount + 1 };
            }
            return { ...p, consecutiveImposterCount: 0 }; // Reset consecutive count for non-imposters
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
                // If gameData is already set (manual movie), keep it. Otherwise random with shuffling.
                if (state.gameData?.type === 'directors-cut') {
                    gameData = state.gameData;
                } else {
                    const allMovies = directorsCut as DirectorsCutMovie[];
                    const available = allMovies.filter(m => !state.usedWords.includes(m.movie));
                    const pool = available.length > 0 ? available : allMovies;

                    const movie = pool[Math.floor(Math.random() * pool.length)];

                    if (!movie) return;

                    set(s => ({ usedWords: [...s.usedWords, movie.movie] }));
                    gameData = { type: 'directors-cut', data: movie };
                }
                break;
            }
            case 'mind-sync': {
                const allQuestions = mindSync as MindSyncQuestion[];
                const available = allQuestions.filter(q => !state.usedWords.includes(q.mainQuestion));
                const pool = available.length > 0 ? available : allQuestions;

                const question = pool[Math.floor(Math.random() * pool.length)];

                if (!question) return;

                set(s => ({ usedWords: [...s.usedWords, question.mainQuestion] }));
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
                const variant = settings.timeBombVariant || 'classic'; // Default to classic if not set
                let duration = settings.discussionTime;
                let hiddenTimer = false;

                // Handle Random Time Mode
                if (duration === -1) {
                    // Random duration between 20 and 90 seconds
                    duration = Math.floor(Math.random() * (90 - 20 + 1)) + 20;
                    hiddenTimer = true;
                }

                if (variant === 'movies') {
                    // Movies Mode
                    const { TIME_BOMB_SCENARIOS } = require('@/data/time-bomb-scenarios');
                    const scenario = TIME_BOMB_SCENARIOS[Math.floor(Math.random() * TIME_BOMB_SCENARIOS.length)];

                    gameData = {
                        type: 'time-bomb',
                        data: {
                            variant: 'movies',
                            scenario,
                            duration,
                            hiddenTimer
                        }
                    };
                } else {
                    // Classic Mode
                    // Custom categories for Time Bomb
                    const bombCategories = [
                        'Movie', 'Food', 'Game', 'Animal', 'Brand', 'Thing',
                        'Celebrity', 'Country', 'Song', 'City', 'Color',
                        'Fruit', 'Vegetable', 'App', 'Website', 'Car', 'Clothes', 'Drink'
                    ];

                    // Pick random category
                    const category = bombCategories[Math.floor(Math.random() * bombCategories.length)];

                    // Pick random letter A-Z (including X, Q, Z etc. as requested)
                    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

                    gameData = {
                        type: 'time-bomb',
                        data: {
                            variant: 'classic',
                            category,
                            letter,
                            duration,
                            hiddenTimer
                        }
                    };
                }
                break;
            }

            case 'wavelength': {
                // Wavelength specific setup
                const psychicId = state.nextRoundPlayerId; // Manual selection REQUIRED

                if (!psychicId) {
                    console.error("Wavelength started without a psychic!");
                    return;
                }

                const spectrum = getRandomSpectrum(state.usedWords);
                // Mark this spectrum as used
                set(s => ({ usedWords: [...s.usedWords, spectrum.left + spectrum.right] }));

                const targetValue = Math.floor(Math.random() * 101); // 0-100

                gameData = {
                    type: 'wavelength',
                    data: {
                        spectrum,
                        targetValue,
                        clueGiverId: psychicId,
                        clue: null,
                        guesses: {},
                        points: null
                    }
                };

                set({ nextRoundPlayerId: null });
                break;
            }

            case 'charades': {
                // Charades specific setup
                const actorId = state.nextRoundPlayerId; // Manual selection REQUIRED

                if (!actorId) {
                    console.error("Charades started without an actor!");
                    return;
                }

                const BATCH_SIZE = 30; // Reduced from 50 to preserve words

                // 1. Filter out used words
                let available = CHARADES_WORDS.filter(w => !state.usedWords.includes(w));

                // 2. Recycle if needed (if fewer than batch size remain)
                if (available.length < BATCH_SIZE) {
                    // Recycle pool - use full list
                    available = [...CHARADES_WORDS];
                    // We don't clear usedWords globally as it affects other modes,
                    // but we effectively ignore the filter for this round.
                }

                // 3. Fisher-Yates Shuffle
                for (let i = available.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [available[i], available[j]] = [available[j], available[i]];
                }

                // 4. Select batch
                const gameWords = available.slice(0, BATCH_SIZE);

                // 5. Mark as used
                set(s => ({
                    usedWords: [...s.usedWords, ...gameWords]
                }));

                const charadesDuration = (settings.charadesTime && settings.charadesTime > 0) ? settings.charadesTime : 60;

                gameData = {
                    type: 'charades',
                    data: {
                        words: gameWords,
                        duration: charadesDuration,
                        selectedPlayerId: actorId,
                        controlMode: settings.charadesControl
                    }
                };

                set({ nextRoundPlayerId: null });
                break;
            }

            case 'thief-police': {
                // Use dedicated Thief & Police word pairs
                const availablePairs = thiefPoliceWords.filter((p) => !state.usedWords.includes(p.policeWord));
                const pool = availablePairs.length > 0 ? availablePairs : thiefPoliceWords;
                const randomPair = pool[Math.floor(Math.random() * pool.length)];

                // Add to used words
                set(s => ({ usedWords: [...s.usedWords, randomPair.policeWord] }));

                // Randomly select Police and Thief from different players
                const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
                const policePlayer = shuffledPlayers[0];
                const thiefPlayer = shuffledPlayers[1];

                // CRITICAL: Ensure specialIndices matches the Thief so generic logic handles stats correctly
                specialIndices = [players.findIndex(p => p.id === thiefPlayer.id)];

                gameData = {
                    type: 'thief-police',
                    data: {
                        policeWord: randomPair.policeWord,
                        thiefWord: randomPair.thiefWord,
                        category: 'Thief & Police',
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
                // imposterCount is NOT reset here, it persists for "Smart Shuffle"
                // consecutiveImposterCount persists too
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
                    if (directorWinnerId) {
                        // A viewer guessed correctly: They get 2 points
                        if (player.id === directorWinnerId) {
                            pointsToAdd = 2;
                        }
                    } else {
                        // Director won (No one guessed): Director gets 2 points
                        if (player.id === directorId) {
                            pointsToAdd = 2;
                        }
                    }
                    break;

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
                            variant: 'classic',
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

    refreshTimeBombData: () => {
        const state = get();
        if (state.gameData?.type !== 'time-bomb') return;

        const variant = state.settings.timeBombVariant || 'classic';

        if (variant === 'movies') {
            const { TIME_BOMB_SCENARIOS } = require('@/data/time-bomb-scenarios');
            const scenario = TIME_BOMB_SCENARIOS[Math.floor(Math.random() * TIME_BOMB_SCENARIOS.length)];

            set({
                gameData: {
                    type: 'time-bomb',
                    data: {
                        ...state.gameData.data,
                        variant: 'movies',
                        scenario,
                        // Clear classic fields to be safe/clean
                        category: undefined,
                        letter: undefined
                    }
                }
            });
        } else {
            // Classic Mode
            const bombCategories = [
                'Movie', 'Food', 'Game', 'Animal', 'Brand', 'Thing',
                'Celebrity', 'Country', 'Song', 'City', 'Color',
                'Fruit', 'Vegetable', 'App', 'Website', 'Car', 'Clothes', 'Drink'
            ];

            // Pick random category
            const category = bombCategories[Math.floor(Math.random() * bombCategories.length)];
            // Pick random letter A-Z
            const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));

            set({
                gameData: {
                    type: 'time-bomb',
                    data: {
                        ...state.gameData.data,
                        variant: 'classic', // Enforce variant
                        category,
                        letter,
                        // Clear movie fields
                        scenario: undefined
                    }
                }
            });
        }
    },

    submitWavelengthClue: (clue: string) => {
        set((state) => {
            if (state.gameData?.type !== 'wavelength') return {};
            return {
                gameData: {
                    ...state.gameData,
                    data: {
                        ...state.gameData.data,
                        clue
                    }
                }
            };
        });
    },

    submitWavelengthGuess: (playerId: string, value: number) => {
        set((state) => {
            if (state.gameData?.type !== 'wavelength') return {};
            return {
                gameData: {
                    ...state.gameData,
                    data: {
                        ...state.gameData.data,
                        guesses: {
                            ...state.gameData.data.guesses,
                            [playerId]: value
                        }
                    }
                }
            };
        });
    },

    revealWavelengthResult: () => {
        set((state) => {
            if (state.gameData?.type !== 'wavelength') return {};

            const { guesses, targetValue, clueGiverId } = state.gameData.data;
            let maxRoundPoints = 0;

            // 1. Calculate scores for guessers
            let updatedPlayers = state.players.map(p => {
                // Skip Psychic
                if (p.id === clueGiverId) return p;

                const guess = guesses[p.id];
                if (guess === undefined) return p;

                const diff = Math.abs(guess - targetValue);
                let points = 0;

                // Scoring
                if (diff <= 5) points = 2;
                else if (diff <= 15) points = 1;

                if (points > maxRoundPoints) maxRoundPoints = points;

                return {
                    ...p,
                    score: p.score + points
                };
            });

            // 2. Award Psychic matches best guesser
            updatedPlayers = updatedPlayers.map(p => {
                if (p.id === clueGiverId) {
                    return {
                        ...p,
                        score: p.score + maxRoundPoints
                    };
                }
                return p;
            });

            // 3. Check for Winner (first to WINNING_SCORE)
            const WINNING_SCORE = 10;
            const winningPlayer = updatedPlayers.find(p => p.score >= WINNING_SCORE);

            return {
                phase: 'results',
                players: updatedPlayers,
                overallWinner: winningPlayer || null // Identify winner if any
            };
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
                    return {
                        isImposter: false,
                        isPolice: true,
                        isThief: false,
                        word: policeWord,
                        hint: 'You are the POLICE. Find the Thief!',
                    };
                }
                if (player.id === thiefPlayerId) {
                    return {
                        isImposter: true,
                        isPolice: false,
                        isThief: true,
                        word: thiefWord,
                        hint: 'You are the THIEF. Blend in!',
                    };
                }
                return {
                    isImposter: false,
                    isPolice: false,
                    isThief: false,
                    word: policeWord,
                    hint: 'You are a CIVILIAN. Help the Police!',
                };
            }

            case 'wavelength': {
                if (gameData?.type !== 'wavelength') {
                    return { isImposter: false, word: null, hint: null };
                }
                const { spectrum, targetValue, clue, clueGiverId } = gameData.data;

                // The 'imposter' logic is reused for checking if they are the special role,
                // BUT we should prioritize checking clueGiverId for explicit manual selection.
                // If clueGiverId is set, use that. Fallback to isImposter.

                const isThePsychic = player.id === clueGiverId || player.isImposter;

                if (isThePsychic) {
                    return {
                        isImposter: true,
                        word: null,
                        hint: `Target: ${targetValue}`,
                    };
                }

                return {
                    isImposter: false,
                    word: null,
                    hint: clue ? `Clue: ${clue}` : 'Waiting for Psychic...',
                };
            }

            default:
                return { isImposter: false, word: null, hint: null };
        }
    },

    // Three Acts Implementation
    startThreeActsGame: (teams: ThreeActsTeam[]) => {
        set({
            gameMode: 'three-acts',
            phase: 'discussion', // Using 'discussion' as the main game phase
            gameData: {
                type: 'three-acts',
                data: {
                    teams,
                    currentTeamIndex: 0,
                    currentAct: 1,
                    timerStarted: false,
                    timeRemaining: 60,
                    actOptions: { act1: ['', ''], act2: ['', ''], act3: ['', ''] }, // Placeholder, populate on turn start
                    currentSelection: null,
                }
            }
        });
    },

    startThreeActsTurn: () => {
        const { THREE_ACTS_MOVIES } = require('@/data/three-acts-movies');
        const state = get();

        // 1. Filter out used movies
        let available = THREE_ACTS_MOVIES.filter((m: string) => !state.usedWords.includes(m));

        // 2. Recycle if not enough movies for a full turn (need 6)
        if (available.length < 6) {
            available = [...THREE_ACTS_MOVIES];
            // We don't clear state.usedWords here to avoid affecting other modes/stats, 
            // but we allow picking from the full list again.
        }

        // 3. Pick 6 unique random movies
        const shuffled = available.sort(() => 0.5 - Math.random());
        const options = shuffled.slice(0, 6);

        // 4. Update state (adding new movies to usedWords)
        set((state) => {
            const currentData = state.gameData?.data as ThreeActsData;
            if (!currentData) return {};

            return {
                usedWords: [...state.usedWords, ...options],
                gameData: {
                    type: 'three-acts',
                    data: {
                        ...currentData,
                        currentAct: 1,
                        timerStarted: true,
                        timeRemaining: 60,
                        currentSelection: null,
                        actOptions: {
                            act1: [options[0], options[1]],
                            act2: [options[2], options[3]],
                            act3: [options[4], options[5]],
                        }
                    }
                }
            };
        });
    },

    threeActsSelectOption: (option: string) => {
        set((state) => {
            const currentData = state.gameData?.data as ThreeActsData;
            if (!currentData) return {};
            return {
                gameData: {
                    type: 'three-acts',
                    data: { ...currentData, currentSelection: option }
                }
            };
        });
    },

    threeActsAction: (action: 'correct' | 'skip') => {
        const state = get();
        const currentData = state.gameData?.data as ThreeActsData;
        if (!currentData) return;

        // Only require selection for 'correct' action
        if (action === 'correct' && !currentData.currentSelection) return;

        const { currentAct, currentTeamIndex, teams, actOptions } = currentData;
        const currentTeam = teams[currentTeamIndex];

        // Update stats
        const actKey = `act${currentAct}` as keyof typeof currentTeam.roundStats;
        const updatedRoundStats = {
            ...currentTeam.roundStats,
            [actKey]: {
                chosen: currentData.currentSelection || '',
                guessed: action === 'correct',
                skipped: action === 'skip',
                options: actOptions[actKey]
            }
        };

        const updatedTeams = [...teams];
        updatedTeams[currentTeamIndex] = { ...currentTeam, roundStats: updatedRoundStats };

        // Move to next act or finish turn
        if (currentAct < 3) {
            set({
                gameData: {
                    type: 'three-acts',
                    data: {
                        ...currentData,
                        teams: updatedTeams,
                        currentAct: (currentAct + 1) as 1 | 2 | 3,
                        currentSelection: null
                    }
                }
            });
        } else {
            // Turn complete - Calculate Score
            let correctCount = 0;
            if (updatedRoundStats.act1.guessed) correctCount++;
            if (updatedRoundStats.act2.guessed) correctCount++;
            if (updatedRoundStats.act3.guessed) correctCount++;

            // Scoring Rules:
            // 3 Correct -> 2 Pts per player
            // 1-2 Correct -> 1 Pt per player
            // 0 Correct -> 0 Pts

            let pointsPerPlayer = 0;
            if (correctCount === 3) {
                pointsPerPlayer = 2;
            } else if (correctCount > 0) {
                pointsPerPlayer = 1;
            }

            const teamPoints = pointsPerPlayer * 2;

            updatedTeams[currentTeamIndex].score += teamPoints;

            // Update individual players scores
            const allPlayers = state.players.map(p => {
                if (p.id === currentTeam.player1Id || p.id === currentTeam.player2Id) {
                    return { ...p, score: p.score + pointsPerPlayer };
                }
                return p;
            });

            updatedTeams[currentTeamIndex].turnComplete = true;

            // Check for Game Winner (First to 10)
            const winner = allPlayers.find(p => p.score >= 10);

            set({
                players: allPlayers,
                overallWinner: winner || null,
                gameData: {
                    type: 'three-acts',
                    data: {
                        ...currentData,
                        teams: updatedTeams,
                        timerStarted: false,
                        currentSelection: null
                    }
                }
            });
        }
    },

    nextThreeActsTeam: () => {
        const state = get();
        const currentData = state.gameData?.data as ThreeActsData;
        if (!currentData) return;

        const nextIndex = currentData.currentTeamIndex + 1;
        if (nextIndex < currentData.teams.length) {
            set({
                gameData: {
                    type: 'three-acts',
                    data: {
                        ...currentData,
                        currentTeamIndex: nextIndex,
                        currentAct: 1,
                        timerStarted: false,
                        timeRemaining: 60,
                        currentSelection: null,
                    }
                }
            });
        } else {
            // All teams done -> Results
            set({ phase: 'results' });
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
                return { specialRoleName: 'Imposter', specialRoleIcon: 'person', normalRoleName: 'Crewmate' };
            case 'directors-cut':
                return { specialRoleName: 'Director', specialRoleIcon: 'videocam', normalRoleName: 'Viewer' };
            case 'mind-sync':
                return { specialRoleName: 'Outlier', specialRoleIcon: 'flash', normalRoleName: 'Player' };
            case 'classic-imposter':
                return { specialRoleName: 'Undercover', specialRoleIcon: 'search', normalRoleName: 'Player' };
            case 'wavelength':
                return { specialRoleName: 'Psychic', specialRoleIcon: 'eye', normalRoleName: 'Guesser' };
            default:
                return { specialRoleName: 'Imposter', specialRoleIcon: 'person', normalRoleName: 'Crewmate' };
        }
    },
}));
