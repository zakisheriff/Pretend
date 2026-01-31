import { mindSync } from '@/data/game-modes';
import { themes, undercoverThemes } from '@/data/themes';
import { WAVELENGTH_SPECTRUMS } from '@/data/wavelength';
import { supabase } from '@/lib/supabase';
import { GameMode, MindSyncQuestion, Theme, UndercoverTheme } from '@/types/game';

// Helper to generate a 4-letter room code
const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

export const GameAPI = {
    /**
     * Creates a new game room
     */
    createRoom: async (hostName: string, gameMode: GameMode) => {
        try {
            const code = generateRoomCode();

            // Create the room
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .insert({
                    code,
                    game_mode: gameMode,
                    status: 'LOBBY'
                    // host_name removed as it might not exist in schema and is redundant
                })
                .select()
                .single();

            if (roomError) throw roomError;

            // Add the host as a player
            const { data: player, error: playerError } = await supabase
                .from('players')
                .insert({
                    room_code: code,
                    name: hostName,
                    is_host: true
                })
                .select()
                .single();

            if (playerError) throw playerError;

            return { room, player, error: null };
        } catch (error: any) {
            console.error('Error creating room:', error);
            return { room: null, player: null, error };
        }
    },

    /**
     * Joins an existing game room
     */
    joinRoom: async (playerName: string, roomCode: string) => {
        try {
            // Check if room exists and is in LOBBY state
            const { data: room, error: roomError } = await supabase
                .from('rooms')
                .select('*')
                .eq('code', roomCode.toUpperCase())
                .single();

            if (roomError || !room) {
                return { error: 'Room not found' };
            }

            if (room.status === 'PLAYING') {
                return { error: 'Game already started' };
            }

            // Check if name is already taken in this room
            const { data: existingPlayers } = await supabase
                .from('players')
                .select('name')
                .eq('room_code', roomCode.toUpperCase()); // No .ilike() here as we want to do strict check locally or rely on DB case sensitivity if any.
            // But for "Mess", usually case-insensitive check is better.
            // Let's stick to client-side filter for now or precise EQ match.
            // To be robust:

            const nameExists = existingPlayers?.some(p => p.name.trim().toLowerCase() === playerName.trim().toLowerCase());

            if (nameExists) {
                return { error: 'Name already taken by another player' };
            }

            // Add player
            const { data: player, error: playerError } = await supabase
                .from('players')
                .insert({
                    room_code: roomCode.toUpperCase(),
                    name: playerName.trim(), // Ensure trimmed name is saved
                    is_host: false
                })
                .select()
                .single();

            if (playerError) throw playerError;

            return { room, player, error: null };
        } catch (error: any) {
            console.error('Error joining room:', error);
            return { error: error.message };
        }
    },

    /**
     * Leave a room
     */
    /**
     * Leave a room
     */
    leaveRoom: async (playerId: string) => {
        const res = await supabase.from('players').delete().eq('id', playerId).select();
        if (res.error) console.error('Supabase leaveRoom error:', res.error);
        if (res.data && res.data.length === 0) {
            console.warn('leaveRoom: No rows deleted. This usually means RLS is blocking the host from deleting other players.');
            return { data: res.data, error: { message: 'RLS_BLOCK' } as any };
        }
        return res;
    },

    /**
     * Delete a room (Host only)
     */
    deleteRoom: async (roomCode: string) => {
        // First delete players explicitly to be sure (since we don't know if CASCADE is set)
        await supabase.from('players').delete().eq('room_code', roomCode.toUpperCase());
        return await supabase.from('rooms').delete().eq('code', roomCode.toUpperCase());
    },

    /**
     * Start the game
     */
    /**
     * Start the game
     */
    startGame: async (roomCode: string, gameMode: string = 'undercover-word', options: { directorId?: string, psychicId?: string, themeIds?: string[], hintLevel?: 'none' | 'low' | 'medium' } = {}) => {
        try {
            // 1. Get players
            const { data: players, error: playersError } = await supabase
                .from('players')
                .select('*')
                .eq('room_code', roomCode);

            if (playersError || !players || players.length < 2) {
                return { error: 'Not enough players' };
            }

            const updatePromises: any[] = [];

            switch (gameMode) {
                case 'pictionary':
                    // Pictionary Mode:
                    // 1. Sort players to ensure deterministic order (matching frontend logic)
                    // Added ID as tie-breaker for perfect stability
                    const sortedPlayers = [...players].sort((a, b) =>
                        (a.created_at || '').localeCompare(b.created_at || '') ||
                        a.id.localeCompare(b.id)
                    );

                    const firstDrawer = sortedPlayers[0];
                    const otherIds = sortedPlayers.slice(1).map(p => p.id);

                    // 2. Initialize Game Data for Persistence (Round 1, Drawer ID)
                    await supabase
                        .from('rooms')
                        .update({
                            game_data: {
                                type: 'pictionary',
                                data: {
                                    round: 1,
                                    turnIndex: 0, // Explicitly start at 0
                                    drawerId: firstDrawer.id,
                                    totalPlayers: sortedPlayers.length
                                }
                            }
                        })
                        .eq('code', roomCode);

                    // 3. Set Roles
                    await supabase
                        .from('players')
                        .update({ role: 'drawer', secret_word: 'WAITING', vote: null }) // WAITING for word selection
                        .eq('id', firstDrawer.id);

                    if (otherIds.length > 0) {
                        await supabase
                            .from('players')
                            .update({ role: 'guesser', secret_word: '', vote: null })
                            .in('id', otherIds);
                    }
                    break;

                case 'time-bomb':
                    const categories = ['Movie', 'Food', 'Game', 'Animal', 'Brand', 'City', 'Country', 'Song', 'Celebrity'];
                    const category = categories[Math.floor(Math.random() * categories.length)];
                    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                    const payload = JSON.stringify({ category, letter });

                    await supabase
                        .from('players')
                        .update({ role: 'player', secret_word: payload, vote: null })
                        .eq('room_code', roomCode);
                    break;

                case 'directors-cut':
                    let directorId = options.directorId;
                    if (!directorId) {
                        const randomPlayer = players[Math.floor(Math.random() * players.length)];
                        directorId = randomPlayer.id;
                    }
                    const targetDirectorId = String(directorId).trim();

                    await supabase
                        .from('players')
                        .update({ role: 'viewer', secret_word: 'WAITING', vote: null })
                        .eq('room_code', roomCode);

                    await supabase
                        .from('players')
                        .update({ role: 'director' })
                        .eq('id', targetDirectorId);
                    break;

                case 'wavelength':
                    let psychicPlayer: any;
                    // Support manual selection if provided (Host's choice)
                    if (options.psychicId) {
                        psychicPlayer = players.find(p => p.id === options.psychicId);
                    }

                    // Fallback to random if not found/provided
                    if (!psychicPlayer) {
                        const psychicIndex = Math.floor(Math.random() * players.length);
                        psychicPlayer = players[psychicIndex];
                    }

                    const spectrum = WAVELENGTH_SPECTRUMS[Math.floor(Math.random() * WAVELENGTH_SPECTRUMS.length)];
                    const target = Math.floor(Math.random() * 100);

                    const wavelengthPayload = JSON.stringify({ ...spectrum, target });
                    const guesserPayload = JSON.stringify({ ...spectrum, target: null });

                    // Sequential assignment
                    await supabase
                        .from('players')
                        .update({ role: 'guesser', secret_word: guesserPayload, vote: null })
                        .eq('room_code', roomCode);

                    await supabase
                        .from('players')
                        .update({ role: 'psychic', secret_word: wavelengthPayload })
                        .eq('id', psychicPlayer.id);
                    break;

                case 'mind-sync':
                    // Mind Sync Mode: Everyone answers a question, one player has a different (outlier) question
                    if (players.length < 3) {
                        return { error: 'Mind Sync requires at least 3 players' };
                    }

                    // Get random question pair
                    const allQuestions = mindSync as MindSyncQuestion[];
                    const question = allQuestions[Math.floor(Math.random() * allQuestions.length)];

                    if (!question) {
                        return { error: 'No questions available' };
                    }

                    // Select random outlier
                    const outlierIndex = Math.floor(Math.random() * players.length);
                    const outlierPlayer = players[outlierIndex];

                    // Set up game data with timer settings
                    await supabase
                        .from('rooms')
                        .update({
                            game_data: {
                                type: 'mind-sync',
                                data: {
                                    mainQuestion: question.mainQuestion,
                                    outlierQuestion: question.outlierQuestion,
                                    category: question.category,
                                    timer: 60, // 60 seconds for answering
                                    answers: {}, // Unused now, but kept for schema compatibility
                                    phase: 'answering' // answering, reveal, discussion, voting
                                }
                            }
                        })
                        .eq('code', roomCode);

                    // Assign questions to players
                    // Outlier gets the outlier question
                    await supabase
                        .from('players')
                        .update({
                            role: 'outlier',
                            secret_word: JSON.stringify({
                                question: question.outlierQuestion,
                                category: question.category,
                                isOutlier: true
                            }),
                            vote: null
                        })
                        .eq('id', outlierPlayer.id);

                    // Others get the main question
                    const syncPlayerIds = players.filter(p => p.id !== outlierPlayer.id).map(p => p.id);
                    if (syncPlayerIds.length > 0) {
                        await supabase
                            .from('players')
                            .update({
                                role: 'sync',
                                secret_word: JSON.stringify({
                                    question: question.mainQuestion,
                                    category: question.category,
                                    isOutlier: false
                                }),
                                vote: null
                            })
                            .in('id', syncPlayerIds);
                    }
                    break;

                case 'classic-imposter':
                    // Undercover Mode: Everyone gets a word, one player has a DIFFERENT word
                    if (players.length < 3) {
                        return { error: 'Undercover requires at least 3 players' };
                    }

                    // Get themes - filter by selected themeIds if provided
                    let selectedUndercoverThemes = undercoverThemes as UndercoverTheme[];
                    if (options.themeIds && options.themeIds.length > 0) {
                        selectedUndercoverThemes = selectedUndercoverThemes.filter(t => options.themeIds!.includes(t.id));
                    }
                    if (selectedUndercoverThemes.length === 0) {
                        selectedUndercoverThemes = undercoverThemes as UndercoverTheme[];
                    }
                    const randomTheme = selectedUndercoverThemes[Math.floor(Math.random() * selectedUndercoverThemes.length)];
                    const randomPair = randomTheme.pairs[Math.floor(Math.random() * randomTheme.pairs.length)];

                    // Select random undercover player
                    const undercoverIndex = Math.floor(Math.random() * players.length);
                    const undercoverPlayer = players[undercoverIndex];

                    // Set up game data
                    await supabase
                        .from('rooms')
                        .update({
                            game_data: {
                                type: 'classic-imposter',
                                data: {
                                    crewmateWord: randomPair.crewmateWord,
                                    imposterWord: randomPair.imposterWord,
                                    themeName: randomTheme.name
                                }
                            }
                        })
                        .eq('code', roomCode);

                    // Assign words to players
                    // Undercover player gets the different word
                    await supabase
                        .from('players')
                        .update({
                            role: 'undercover',
                            secret_word: randomPair.imposterWord,
                            vote: null
                        })
                        .eq('id', undercoverPlayer.id);

                    // Others get the crewmate word
                    const crewPlayerIds = players.filter(p => p.id !== undercoverPlayer.id).map(p => p.id);
                    if (crewPlayerIds.length > 0) {
                        await supabase
                            .from('players')
                            .update({
                                role: 'crewmate',
                                secret_word: randomPair.crewmateWord,
                                vote: null
                            })
                            .in('id', crewPlayerIds);
                    }
                    break;

                case 'undercover-word':
                default:
                    // Classic Imposter Mode: Crewmates see the word, Imposter only gets a hint
                    if (players.length < 3) {
                        return { error: 'Classic Imposter requires at least 3 players' };
                    }

                    // Get themes - filter by selected themeIds if provided
                    let selectedImposterThemes = themes as Theme[];
                    if (options.themeIds && options.themeIds.length > 0) {
                        selectedImposterThemes = selectedImposterThemes.filter(t => options.themeIds!.includes(t.id));
                    }
                    if (selectedImposterThemes.length === 0) {
                        selectedImposterThemes = themes as Theme[];
                    }

                    // Pick random theme and word
                    const imposterTheme = selectedImposterThemes[Math.floor(Math.random() * selectedImposterThemes.length)];
                    const wordEntry = imposterTheme.words[Math.floor(Math.random() * imposterTheme.words.length)];

                    // Determine hint based on hintLevel
                    const hintLevel = options.hintLevel || 'low';
                    let imposterHint = '';
                    if (hintLevel !== 'none' && wordEntry.hints) {
                        imposterHint = wordEntry.hints[hintLevel] || wordEntry.hints.low || '';
                    }

                    const imposterIndex = Math.floor(Math.random() * players.length);
                    const imposterPlayer = players[imposterIndex];

                    // Set up game data
                    await supabase
                        .from('rooms')
                        .update({
                            game_data: {
                                type: 'undercover-word',
                                data: {
                                    crewmateWord: wordEntry.word,
                                    imposterHint: imposterHint || 'No hint provided',
                                    hintLevel: hintLevel,
                                    category: imposterTheme.name
                                }
                            }
                        })
                        .eq('code', roomCode);

                    await supabase
                        .from('players')
                        .update({ role: 'crewmate', secret_word: wordEntry.word, vote: null })
                        .eq('room_code', roomCode);

                    await supabase
                        .from('players')
                        .update({ role: 'imposter', secret_word: imposterHint || 'You are the imposter!' })
                        .eq('id', imposterPlayer.id);
                    break;
            }

            // 5. Start Game
            const initialPhase =
                gameMode === 'directors-cut' ? 'SETUP_DIRECTOR:PLAYER' :
                    gameMode === 'pictionary' ? 'PICTIONARY:SELECT_WORD' :
                        gameMode === 'mind-sync' ? 'MINDSYNC:ANSWERING' :
                            'reveal'; // classic-imposter, undercover-word, and others go to reveal
            const { error } = await supabase
                .from('rooms')
                .update({
                    status: 'PLAYING',
                    curr_phase: initialPhase,
                    game_mode: gameMode
                })
                .eq('code', roomCode);

            if (error) throw error;
            return { error: null };
        } catch (error: any) {
            console.error('Error starting game:', error);
            return { error: error.message };
        }
    },

    checkConnection: async () => {
        const { error } = await supabase.from('rooms').select('code').limit(1);
        return !error;
    },

    updateGamePhase: async (roomCode: string, phase: string) => {
        return await supabase.from('rooms').update({ curr_phase: phase }).eq('code', roomCode);
    },

    updateGameMode: async (roomCode: string, mode: string) => {
        return await supabase.from('rooms').update({ game_mode: mode }).eq('code', roomCode);
    },

    updateGameData: async (roomCode: string, data: any) => {
        return await supabase.from('rooms').update({ game_data: { type: 'pictionary', data } }).eq('code', roomCode);
    },

    assignDirector: async (roomCode: string, directorId: string) => {
        // 1. Reset current director(s) to viewer
        await supabase
            .from('players')
            .update({ role: 'viewer', secret_word: 'WAITING' })
            .eq('room_code', roomCode)
            .eq('role', 'director');

        // 2. Set new director
        return await supabase
            .from('players')
            .update({ role: 'director' })
            .eq('id', directorId);
    },

    setWavelengthClue: async (roomCode: string, clue: string) => {
        // 1. Get current secret_word data for anyone in the room (to get spectrum)
        const { data: players } = await supabase.from('players').select('*').eq('room_code', roomCode);
        if (!players) return;

        const updatePromises = players.map(p => {
            try {
                const existing = JSON.parse(p.secret_word || '{}');
                const newPayload = JSON.stringify({ ...existing, clue });
                return supabase.from('players').update({ secret_word: newPayload }).eq('id', p.id);
            } catch (e) {
                return null;
            }
        }).filter(Boolean);

        await Promise.all(updatePromises);

        // 2. Move to discussion phase
        return await supabase.from('rooms').update({ curr_phase: 'discussion' }).eq('code', roomCode);
    },

    setDirectorMovie: async (roomCode: string, movieJson: string, nextPhase: string = 'discussion') => {
        // Fetch all players in the room first
        const { data: players, error: fetchError } = await supabase
            .from('players')
            .select('id, role')
            .eq('room_code', roomCode);

        if (fetchError) throw fetchError;
        if (!players) return;

        const director = players.find(p => p.role === 'director');
        const others = players.filter(p => p.role !== 'director');

        // 1. Update the director's secret_word
        if (director) {
            const { error: dError } = await supabase
                .from('players')
                .update({ secret_word: movieJson })
                .eq('id', director.id);
            if (dError) throw dError;
        }

        // 2. Update all other players
        if (others.length > 0) {
            const otherIds = others.map(o => o.id);
            const { error: vError } = await supabase
                .from('players')
                .update({ secret_word: '???' })
                .in('id', otherIds);
            if (vError) throw vError;
        }

        // 3. Move to next phase
        return await supabase
            .from('rooms')
            .update({ curr_phase: nextPhase })
            .eq('code', roomCode);
    },

    verifyGuess: async (roomCode: string, guess: string) => {
        const { data: director } = await supabase
            .from('players')
            .select('secret_word')
            .eq('room_code', roomCode)
            .eq('role', 'director')
            .single();

        if (!director) return { error: 'No director found' };

        try {
            const secret = JSON.parse(director.secret_word);
            const title = secret.title || '';

            // Simple normalization for comparison
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
            const isCorrect = normalize(title) === normalize(guess);

            if (isCorrect) {
                await supabase.from('rooms').update({ status: 'FINISHED' }).eq('code', roomCode);
            }
            return { correct: isCorrect, title };
        } catch (e) {
            return { error: 'Invalid game state' };
        }
    },

    castVote: async (playerId: string, targetId: string) => {
        return await supabase.from('players').update({ vote: targetId }).eq('id', playerId);
    },

    revealWavelength: async (roomCode: string) => {
        // 1. Get Psychic data and all votes
        const { data: players } = await supabase
            .from('players')
            .select('*')
            .eq('room_code', roomCode);

        const psychic = players?.find(p => p.role === 'psychic');
        if (!psychic) return;

        let target = 50;
        try {
            target = JSON.parse(psychic.secret_word).target;
        } catch (e) { }

        // 2. Award points to guessers based on distance (0-100 scale)
        let bestGuessDistance = 100;
        const guesserUpdatePromises = (players || []).map(p => {
            if (p.role === 'psychic' || !p.vote) return null;

            const guess = parseInt(p.vote);
            const distance = Math.abs(guess - target);
            if (distance < bestGuessDistance) bestGuessDistance = distance;

            let pointsAwarded = 0;
            // Scoring Tiers (Out of 100)
            if (distance <= 12) pointsAwarded = 1; // Bullseye or Close Call -> 1 Point

            if (pointsAwarded > 0) {
                return supabase.from('players').update({ score: (p.score || 0) + pointsAwarded }).eq('id', p.id);
            }
            return null;
        }).filter(Boolean);

        await Promise.all(guesserUpdatePromises);

        // 3. Award points to Psychic
        if (psychic) {
            let psychicPoints = 0;
            if (bestGuessDistance <= 12) psychicPoints = 1;

            if (psychicPoints > 0) {
                await supabase.from('players').update({ score: (psychic.score || 0) + psychicPoints }).eq('id', psychic.id);
            }
        }

        // 4. Broadcast psychic data so they can see results
        await supabase.from('players').update({ secret_word: psychic.secret_word }).eq('room_code', roomCode);

        // 5. Move phase
        return await supabase.from('rooms').update({ curr_phase: 'results', status: 'FINISHED' }).eq('code', roomCode);
    },

    revealImposterResults: async (roomCode: string, gameMode: 'classic-imposter' | 'undercover-word') => {
        // 1. Fetch players
        const { data: players } = await supabase.from('players').select('*').eq('room_code', roomCode);
        if (!players || players.length === 0) return;

        // 2. Identify roles
        let targetRole = '';
        if (gameMode === 'classic-imposter') {
            targetRole = 'undercover';
        } else {
            targetRole = 'imposter'; // undercover-word uses 'imposter' role name
        }

        const targetPlayer = players.find(p => p.role === targetRole);
        if (!targetPlayer) return;

        // 3. Count votes & Determine Winner
        // Majority Rule: > 50% must vote for target to catch them.
        const votesAgainstTarget = players.filter(p => p.vote === targetPlayer.id).length;
        const caught = votesAgainstTarget > (players.length / 2);

        // 4. Update Scores
        const updatePromises = [];

        if (caught) {
            // Crew Wins -> 1 pt each (except target)
            players.forEach(p => {
                if (p.id !== targetPlayer.id) {
                    updatePromises.push(
                        supabase.from('players').update({ score: (p.score || 0) + 1 }).eq('id', p.id)
                    );
                }
            });
        } else {
            // Imposter Wins -> 2 pts
            updatePromises.push(
                supabase.from('players').update({ score: (targetPlayer.score || 0) + 2 }).eq('id', targetPlayer.id)
            );
        }

        await Promise.all(updatePromises);

        // 5. Update Phase
        return await supabase.from('rooms').update({ curr_phase: 'results', status: 'FINISHED' }).eq('code', roomCode);
    },

    revealMindSyncResults: async (roomCode: string) => {
        const { data: players } = await supabase.from('players').select('*').eq('room_code', roomCode);
        if (!players) return;

        const outlier = players.find(p => p.role === 'outlier');
        if (!outlier) return;

        const votes = players.filter(p => p.vote === outlier.id).length;
        const caught = votes > (players.length / 2);

        const updatePromises = [];
        if (caught) {
            // Sync Team Wins -> 1 pt each
            players.forEach(p => {
                if (p.id !== outlier.id) {
                    updatePromises.push(
                        supabase.from('players').update({ score: (p.score || 0) + 1 }).eq('id', p.id)
                    );
                }
            });
        } else {
            // Outlier Wins -> 2 pts
            updatePromises.push(
                supabase.from('players').update({ score: (outlier.score || 0) + 2 }).eq('id', outlier.id)
            );
        }

        await Promise.all(updatePromises);
        return await supabase.from('rooms').update({ curr_phase: 'results', status: 'FINISHED' }).eq('code', roomCode);
    },

    setDirectorWinner: async (roomCode: string, winnerId: string | null) => {
        const updatePromises = [];

        if (winnerId) {
            // 1. Award 2 points to the winner
            const { data: player } = await supabase.from('players').select('score').eq('id', winnerId).single();
            updatePromises.push(
                supabase.from('players').update({ score: (player?.score || 0) + 2 }).eq('id', winnerId)
            );

            // 2. Store the winner ID in the director's vote column so others can see it
            updatePromises.push(
                supabase.from('players').update({ vote: winnerId }).eq('room_code', roomCode).eq('role', 'director')
            );
        } else {
            // If director wins (no one guessed), Award 2 points to Director
            const { data: director } = await supabase.from('players').select('id, score').eq('room_code', roomCode).eq('role', 'director').single();
            if (director) {
                updatePromises.push(
                    supabase.from('players').update({ score: (director.score || 0) + 2, vote: null }).eq('id', director.id)
                );
            }
        }

        updatePromises.push(
            supabase.from('rooms').update({
                status: 'FINISHED',
                curr_phase: 'results'
            }).eq('code', roomCode)
        );

        return await Promise.all(updatePromises);
    },

    resetRoom: async (roomCode: string, resetScores: boolean = false) => {
        // 1. Reset players: clear role, secret_word, vote. Optionally reset score.
        // Fetch player IDs first to ensure robustness
        const { data: playersToReset, error: fetchError } = await supabase
            .from('players')
            .select('id')
            .eq('room_code', roomCode);

        if (fetchError) throw fetchError;

        if (playersToReset && playersToReset.length > 0) {
            const playerIds = playersToReset.map(p => p.id);

            const updatePayload: any = {
                role: 'viewer',
                secret_word: '',
                vote: null
            };

            if (resetScores) {
                updatePayload.score = 0;
            }

            const { error: pError } = await supabase
                .from('players')
                .update(updatePayload)
                .in('id', playerIds); // Use .in() with the fetched IDs

            if (pError) throw pError;
        }

        // 2. Reset room in two steps to avoid large payload issues with Pictionary drawing data
        // Step A: Clear the heavy data first (this notification might be dropped but we don't care)
        await supabase
            .from('rooms')
            .update({ game_data: null })
            .eq('code', roomCode);

        // Step B: Set status to LOBBY (this payload is small and guaranteed to arrive)
        return await supabase
            .from('rooms')
            .update({ status: 'LOBBY', curr_phase: null, game_mode: null })
            .eq('code', roomCode);
    },

    updateGameStatus: async (roomCode: string, status: 'LOBBY' | 'PLAYING' | 'FINISHED') => {
        return await supabase.from('rooms').update({ status }).eq('code', roomCode);
    },

    /**
     * Transfer host ownership to another player
     */
    transferHost: async (oldHostId: string, newHostId: string) => {
        const { error: error1 } = await supabase.from('players').update({ is_host: false }).eq('id', oldHostId);
        if (error1) return { error: error1 };

        const { error: error2 } = await supabase.from('players').update({ is_host: true }).eq('id', newHostId);
        return { error: error2 };
    },

    verifyPictionaryGuessV2: async (roomCode: string, playerId: string, guess: string, timeLeft: number) => {
        // 1. Get drawer word
        const { data: drawer } = await supabase
            .from('players')
            .select('secret_word, id')
            .eq('room_code', roomCode)
            .eq('role', 'drawer')
            .single();

        if (!drawer || !drawer.secret_word || drawer.secret_word === 'WAITING') return { error: 'No active drawer' };

        const normalize = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const target = normalize(drawer.secret_word);
        const input = normalize(guess);

        // Exact Match
        if (target === input) {
            console.log(`✅ Exact match! Target: "${target}", Input: "${input}"`);
            // Pictionary Scoring: 1 Point for correct guess
            const points = 1;

            // Updated Guesser: Manual Fetch + Update (No RPC)
            const { data: guesser } = await supabase.from('players').select('score').eq('id', playerId).single();
            const newScore = (guesser?.score || 0) + points;

            await supabase.from('players').update({ score: newScore, vote: 'CORRECT' }).eq('id', playerId);

            // No points for drawer as per user request
            return { status: 'CORRECT', word: drawer.secret_word, points };
        }

        // Fuzzy Match (Iterative Levenshtein - Robust)
        const levDist = (s: string, t: string) => {
            if (s === t) return 0;
            if (s.length === 0) return t.length;
            if (t.length === 0) return s.length;

            const v0 = new Array(t.length + 1);
            const v1 = new Array(t.length + 1);

            for (let i = 0; i < v0.length; i++) v0[i] = i;

            for (let i = 0; i < s.length; i++) {
                v1[0] = i + 1;
                for (let j = 0; j < t.length; j++) {
                    const cost = s[i] === t[j] ? 0 : 1;
                    v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
                }
                for (let j = 0; j < v0.length; j++) v0[j] = v1[j];
            }
            return v1[t.length];
        };

        // SAFETY CHECK: If length difference is huge, it CANNOT be close
        if (Math.abs(target.length - input.length) > 2) {
            console.log(`❌ Length mismatch too large (${target.length} vs ${input.length})`);
            return { status: 'WRONG', points: 0 };
        }

        const dist = levDist(input, target);

        // Dynamic Tolerance for "Correctness"
        let allowedErrors = 0;
        if (target.length >= 7) allowedErrors = 2; // e.g. "telephone" (9) -> "telephon" (dist 1) -> OK, "telephn" (dist 2) -> OK
        else if (target.length >= 4) allowedErrors = 1;

        console.log(`📝 Fuzzy Check - Target: "${target}", Input: "${input}", Dist: ${dist}, Allowed: ${allowedErrors}`);

        if (dist <= allowedErrors) {
            console.log(`✅ Fuzzy match accepted!`);
            // Fuzzy Correct! 1 Point
            const points = 1;
            const { data: guesser } = await supabase.from('players').select('score').eq('id', playerId).single();
            const newScore = (guesser?.score || 0) + points;
            await supabase.from('players').update({ score: newScore, vote: 'CORRECT' }).eq('id', playerId);
            return { status: 'CORRECT', word: drawer.secret_word, points };
        }

        // "Close" check
        // STRICTER: Only show "Close" if word is at least 3 chars long AND dist is <= threshold + 1
        // AND dist is not 0 (which would be covered by correct, but just in case)
        if (target.length >= 3 && dist <= allowedErrors + 1) {
            console.log(`⚠️ Fuzzy match CLOSE! Dist: ${dist}, Threshold: ${allowedErrors + 1}`);
            return { status: 'CLOSE', points: 0 };
        }

        console.log(`❌ No match.`);
        return { status: 'WRONG', points: 0 };
    },

    /**
     * Submit a Mind Sync answer
     */
    submitMindSyncAnswer: async (roomCode: string, playerId: string, answer: string) => {
        try {
            // 1. Fetch player to preserve existing secret_word data (question/role info)
            const { data: player, error: fetchError } = await supabase
                .from('players')
                .select('secret_word, id')
                .eq('id', playerId)
                .single();

            if (fetchError || !player) return { error: 'Player not found' };

            // 2. Merge answer into secret_word
            let secretData = {};
            try {
                secretData = JSON.parse(player.secret_word || '{}');
            } catch (e) { }

            const updatedSecret = JSON.stringify({
                ...secretData,
                answer: answer.trim()
            });

            // 3. Update Player: Store answer in secret_word AND mark as 'ANSWERED' in vote col for easy counting
            const { error: updateError } = await supabase
                .from('players')
                .update({
                    secret_word: updatedSecret,
                    vote: 'ANSWERED'
                })
                .eq('id', playerId);

            if (updateError) throw updateError;

            // 4. Check if all players have answered
            const { data: allPlayers } = await supabase
                .from('players')
                .select('vote')
                .eq('room_code', roomCode);

            // Check if everyone has a vote status (meaning they answered)
            const allAnswered = allPlayers?.every(p => !!p.vote) ?? false;

            return { error: null, allAnswered };
        } catch (error: any) {
            console.error('Error submitting Mind Sync answer:', error);
            return { error: error.message };
        }
    },

    /**
     * Reveal Mind Sync answers (transition to reveal phase)
     */
    revealMindSyncAnswers: async (roomCode: string) => {
        try {
            // Update game phase to discussion directly (Skipping separate reveal screen as per user request)
            await supabase
                .from('rooms')
                .update({ curr_phase: 'discussion' })
                .eq('code', roomCode);

            return { error: null };
        } catch (error: any) {
            console.error('Error revealing Mind Sync answers:', error);
            return { error: error.message };
        }
    },

    /**
     * Move Mind Sync to discussion phase
     */
    startMindSyncDiscussion: async (roomCode: string) => {
        return await supabase
            .from('rooms')
            .update({ curr_phase: 'discussion' })
            .eq('code', roomCode);
    },

    startMindSyncVoting: async (roomCode: string) => {
        // 1. Clear 'ANSWERED' status from vote column so voting can proceed fresh
        await supabase
            .from('players')
            .update({ vote: null })
            .eq('room_code', roomCode);

        // 2. Set phase to voting
        return await supabase
            .from('rooms')
            .update({ curr_phase: 'voting' })
            .eq('code', roomCode);
    }
};
