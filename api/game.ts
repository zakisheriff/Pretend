
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
            console.error('Error creating room:', JSON.stringify(error, null, 2));
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
        return await supabase.from('players').delete().eq('id', playerId);
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
    startGame: async (roomCode: string) => {
        try {
            // 1. Get players
            const { data: players, error: playersError } = await supabase
                .from('players')
                .select('*')
                .eq('room_code', roomCode);

            if (playersError || !players || players.length < 2) {
                return { error: 'Not enough players' };
            }

            // 2. Select Word Pair
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

            // 3. Select Imposter
            const imposterIndex = Math.floor(Math.random() * players.length);

            // 4. Update Players
            await Promise.all(players.map((player, index) => {
                const isImposter = index === imposterIndex;
                const role = isImposter ? 'imposter' : 'crewmate';
                const secretWord = isImposter ? pair.imposter : pair.crew;

                return supabase
                    .from('players')
                    .update({ role, secret_word: secretWord })
                    .eq('id', player.id);
            }));

            // 5. Start Game
            const { error } = await supabase
                .from('rooms')
                .update({ status: 'PLAYING', curr_phase: 'reveal' })
                .eq('code', roomCode);

            if (error) throw error;
            return { error: null };
        } catch (error: any) {
            console.error('Error starting game:', error);
            return { error: error.message };
        }
    }
};
