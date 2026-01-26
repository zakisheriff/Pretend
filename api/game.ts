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
    startGame: async (roomCode: string, gameMode: string = 'undercover-word') => {
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
                    // Director's Cut: 1 Director, others Guessers. No movie selected yet.
                    const directorIndex = Math.floor(Math.random() * players.length);

                    players.forEach((p, i) => {
                        const isDirector = i === directorIndex;
                        const role = isDirector ? 'director' : 'viewer';
                        // Director will choose later.
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

                    players.forEach((p, i) => {
                        const isPsychic = i === psychicIndex;
                        const role = isPsychic ? 'psychic' : 'guesser';
                        // Psychic sees spectrum AND target. Guessers see ???
                        const secret = isPsychic ? wavelengthPayload : '???';
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

        return await supabase.from('rooms').update({ curr_phase: 'reveal' }).eq('code', roomCode);
    }
};
