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
                    const psychicIndex = Math.floor(Math.random() * players.length);
                    const psychicPlayer = players[psychicIndex];
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

                case 'undercover-word':
                default:
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
                    const imposterPlayer = players[imposterIndex];

                    await supabase
                        .from('players')
                        .update({ role: 'crewmate', secret_word: pair.crew, vote: null })
                        .eq('room_code', roomCode);

                    await supabase
                        .from('players')
                        .update({ role: 'imposter', secret_word: pair.imposter })
                        .eq('id', imposterPlayer.id);
                    break;
            }

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

    setDirectorMovie: async (roomCode: string, movieJson: string) => {
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

        // 3. Move to discussion phase
        return await supabase
            .from('rooms')
            .update({ curr_phase: 'discussion' })
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
            if (distance <= 4) pointsAwarded = 4; // Bullseye
            else if (distance <= 12) pointsAwarded = 3; // Close
            else if (distance <= 22) pointsAwarded = 2; // Partial

            if (pointsAwarded > 0) {
                return supabase.from('players').update({ score: (p.score || 0) + pointsAwarded }).eq('id', p.id);
            }
            return null;
        }).filter(Boolean);

        await Promise.all(guesserUpdatePromises);

        // 3. Award points to Psychic
        if (psychic) {
            let psychicPoints = 0;
            if (bestGuessDistance <= 4) psychicPoints = 3; // Max reward for Psychic
            else if (bestGuessDistance <= 12) psychicPoints = 2;
            else if (bestGuessDistance <= 22) psychicPoints = 1;

            if (psychicPoints > 0) {
                await supabase.from('players').update({ score: (psychic.score || 0) + psychicPoints }).eq('id', psychic.id);
            }
        }

        // 4. Broadcast psychic data so they can see results
        await supabase.from('players').update({ secret_word: psychic.secret_word }).eq('room_code', roomCode);

        // 5. Move phase
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
            // If director wins (no one guessed), clear the director's vote just in case
            updatePromises.push(
                supabase.from('players').update({ vote: null }).eq('room_code', roomCode).eq('role', 'director')
            );
        }

        updatePromises.push(
            supabase.from('rooms').update({
                status: 'FINISHED',
                curr_phase: 'results'
            }).eq('code', roomCode)
        );

        return await Promise.all(updatePromises);
    },

    resetRoom: async (roomCode: string) => {
        // 1. Reset players: clear role, secret_word, vote. KEEP score.
        // Fetch player IDs first to ensure robustness
        const { data: playersToReset, error: fetchError } = await supabase
            .from('players')
            .select('id')
            .eq('room_code', roomCode);

        if (fetchError) throw fetchError;

        if (playersToReset && playersToReset.length > 0) {
            const playerIds = playersToReset.map(p => p.id);
            const { error: pError } = await supabase
                .from('players')
                .update({
                    role: 'viewer',
                    secret_word: '',
                    vote: null
                })
                .in('id', playerIds); // Use .in() with the fetched IDs

            if (pError) throw pError;
        }

        // 2. Reset room: status LOBBY, curr_phase null
        return await supabase
            .from('rooms')
            .update({ status: 'LOBBY', curr_phase: null, game_mode: null })
            .eq('code', roomCode);
    },

    updateGameStatus: async (roomCode: string, status: 'LOBBY' | 'PLAYING' | 'FINISHED') => {
        return await supabase.from('rooms').update({ status }).eq('code', roomCode);
    }
};
