import { WAVELENGTH_SPECTRUMS } from '@/data/wavelength';
import { supabase } from '@/lib/supabase';
import { GameMode } from '@/types/game';

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

            if (room.status !== 'LOBBY') {
                return { error: 'Game already started' };
            }

            // check if name taken? (optional)

            // Add player
            const { data: player, error: playerError } = await supabase
                .from('players')
                .insert({
                    room_code: roomCode.toUpperCase(),
                    name: playerName,
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
        return await supabase.from('players').delete().eq('id', playerId).select();
    },

    /**
     * Delete a room (Host only)
     */
    deleteRoom: async (roomCode: string) => {
        return await supabase.from('rooms').delete().eq('code', roomCode);
    },

    /**
     * Start the game
     */
    /**
     * Start the game
     */
    startGame: async (roomCode: string, gameMode: string = 'undercover-word', options: { directorId?: string } = {}) => {
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
                // ... (time-bomb same) ...
                case 'time-bomb':
                    // Time Bomb Logic
                    const categories = ['Movie', 'Food', 'Game', 'Animal', 'Brand', 'City', 'Country', 'Song', 'Celebrity'];
                    const category = categories[Math.floor(Math.random() * categories.length)];
                    const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
                    // Store data in secret_word as JSON for MVP
                    const payload = JSON.stringify({ category, letter });

                    players.forEach(p => {
                        updatePromises.push(
                            supabase.from('players').update({ role: 'player', secret_word: payload }).eq('id', p.id)
                        );
                    });
                    break;

                case 'directors-cut':
                    // Director's Cut: 1 Director (Manual or Random), others Viewers.
                    let directorId = options.directorId;

                    if (!directorId) {
                        const randomPlayer = players[Math.floor(Math.random() * players.length)];
                        directorId = randomPlayer.id;
                    }

                    // Normalize for comparison
                    const targetDirectorId = String(directorId).trim();

                    players.forEach((p) => {
                        const isDirector = String(p.id).trim() === targetDirectorId;
                        const role = isDirector ? 'director' : 'viewer';
                        updatePromises.push(
                            supabase.from('players').update({ role, secret_word: 'WAITING' }).eq('id', p.id)
                        );
                    });
                    break;

                case 'wavelength':
                    // Wavelength: 1 Psychic, others Guessers
                    const psychicIndex = Math.floor(Math.random() * players.length);
                    const spectrum = WAVELENGTH_SPECTRUMS[Math.floor(Math.random() * WAVELENGTH_SPECTRUMS.length)];
                    // Random target percentage (0-100)
                    const target = Math.floor(Math.random() * 100);

                    const wavelengthPayload = JSON.stringify({ ...spectrum, target });
                    // Guessers need to know the spectrum (Left/Right) but NOT the target
                    const guesserPayload = JSON.stringify({ ...spectrum, target: null });

                    players.forEach((p, i) => {
                        const isPsychic = i === psychicIndex;
                        const role = isPsychic ? 'psychic' : 'guesser';
                        // Psychic sees spectrum AND target. Guessers see spectrum only.
                        const secret = isPsychic ? wavelengthPayload : guesserPayload;
                        updatePromises.push(
                            supabase.from('players').update({ role, secret_word: secret }).eq('id', p.id)
                        );
                    });
                    break;

                case 'undercover-word':
                default:
                    // DEFAULT: Undercover / Classic Imposter (2+ Players supported logic)
                    const WORD_PAIRS = [
                        { crew: "Coffee", imposter: "Tea" },
                        { crew: "Sun", imposter: "Moon" },
                        { crew: "Apple", imposter: "Orange" },
                        { crew: "Car", imposter: "Truck" },
                        { crew: "Dog", imposter: "Cat" },
                        { crew: "Pen", imposter: "Pencil" },
                        { crew: "Beach", imposter: "Pool" },
                        { crew: "Piano", imposter: "Guitar" },
                        { crew: "Book", imposter: "Magazine" },
                        { crew: "Train", imposter: "Bus" },
                    ];

                    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
                    const imposterIndex = Math.floor(Math.random() * players.length);

                    players.forEach((p, index) => {
                        const isImposter = index === imposterIndex;
                        const role = isImposter ? 'imposter' : 'crewmate';
                        const secretWord = isImposter ? pair.imposter : pair.crew;
                        updatePromises.push(
                            supabase.from('players').update({ role, secret_word: secretWord }).eq('id', p.id)
                        );
                    });
                    break;
            }

            await Promise.all(updatePromises);

            // 5. Start Game
            const initialPhase = gameMode === 'directors-cut' ? 'setup' : 'reveal';
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

    setDirectorMovie: async (roomCode: string, movieJson: string) => {
        const { data: players } = await supabase.from('players').select('*').eq('room_code', roomCode);
        if (!players) return;

        const updatePromises = players.map(p => {
            const secret = p.role === 'director' ? movieJson : '???';
            return supabase.from('players').update({ secret_word: secret }).eq('id', p.id);
        });

        await Promise.all(updatePromises);

        return await supabase.from('rooms').update({ curr_phase: 'discussion' }).eq('code', roomCode);
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
        // 1. Get Psychic data to broadcast
        const { data: psychic } = await supabase
            .from('players')
            .select('secret_word')
            .eq('room_code', roomCode)
            .eq('role', 'psychic')
            .single();

        if (!psychic) return;

        // 2. Broadcast to everyone so they can see the result
        await supabase
            .from('players')
            .update({ secret_word: psychic.secret_word })
            .eq('room_code', roomCode);

        // 3. Move phase
        return await supabase.from('rooms').update({ curr_phase: 'results' }).eq('code', roomCode);
    },

    setDirectorWinner: async (roomCode: string, winnerId: string | null) => {
        // Update room status and store the winner if possible (using a broadcast-like approach or room update)
        // For simplicity, we transition to FINISHED status which results in the Results screen. 
        // We can pass winnerId in room metadata if supported, or just trust the results screen to show it.
        // Let's try updating curr_phase to 'results' and status to 'FINISHED'
        return await supabase
            .from('rooms')
            .update({
                status: 'FINISHED',
                curr_phase: 'results'
                // metadata: { winnerId } // Assuming metadata exists or we'll find another way to sync winnerId
            })
            .eq('code', roomCode);
    },

    updateGameStatus: async (roomCode: string, status: 'LOBBY' | 'PLAYING' | 'FINISHED') => {
        return await supabase.from('rooms').update({ status }).eq('code', roomCode);
    }
};
