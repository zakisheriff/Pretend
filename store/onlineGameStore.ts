
import { supabase } from '@/lib/supabase';
import { Player } from '@/types/game';
import { create } from 'zustand';

interface ChatMessage {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
}

interface OnlineGameState {
    roomCode: string | null;
    isHost: boolean;
    myPlayerId: string | null;
    players: Player[];
    gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';
    gamePhase: 'setup' | 'reveal' | 'discussion' | 'voting' | null;
    gameMode: string | null;
    messages: ChatMessage[];

    // Actions
    // Actions
    setRoomInfo: (code: string, isHost: boolean, playerId: string, initialPlayer?: any) => void;
    setGameInfo: (status: 'LOBBY' | 'PLAYING' | 'FINISHED', mode: string, phase?: string) => void;
    syncGameState: (newState: any) => void;
    leaveGame: () => void;
    sendChatMessage: (content: string) => Promise<void>;
    removePlayer: (id: string) => void;
}

// Helper to map DB player
const mapPlayer = (p: any) => ({
    ...p,
    isHost: p.is_host,
    isImposter: p.role === 'imposter',
    score: p.score || 0,
    secretWord: p.secret_word,
    role: p.role
});

export const useOnlineGameStore = create<OnlineGameState>((set, get) => ({
    roomCode: null,
    isHost: false,
    myPlayerId: null,
    players: [],
    gameStatus: 'LOBBY',
    gamePhase: null,
    gameMode: null,
    messages: [],

    setRoomInfo: (code, isHost, playerId, initialPlayer) => {
        const startPlayers = initialPlayer ? [mapPlayer(initialPlayer)] : [];
        set({ roomCode: code, isHost, myPlayerId: playerId, messages: [], players: startPlayers });

        // ... existing fetches ...

        // 2. Subscribe to changes & broadcast
        const channel = supabase.channel(`room:${code}`);

        channel
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'players', filter: `room_code=eq.${code}` },
                (payload) => {
                    set(state => ({ players: [...state.players, mapPlayer(payload.new)] }));
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'players', filter: `room_code=eq.${code}` },
                (payload) => {
                    set(state => ({
                        players: state.players.map(p => p.id === payload.new.id ? mapPlayer(payload.new) : p)
                    }));
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'players', filter: `room_code=eq.${code}` },
                (payload) => {
                    set(state => ({
                        players: state.players.filter(p => p.id !== payload.old.id)
                    }));
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
                (payload) => {
                    const newRoom = payload.new as any;
                    set({
                        gameStatus: newRoom.status,
                        gameMode: newRoom.game_mode,
                        gamePhase: newRoom.curr_phase
                    });
                }
            )
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                set(state => ({ messages: [...state.messages, payload] }));
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Optional: Refetch once to be sure
                }
            });
    },

    syncGameState: (newState) => {
        set({ ...newState });
    },

    removePlayer: (id) => {
        set(state => ({
            players: state.players.filter(p => p.id !== id)
        }));
    },

    setGameInfo: (status, mode, phase) => {
        set({ gameStatus: status, gameMode: mode, gamePhase: phase as any || 'reveal' });
    },

    sendChatMessage: async (content: string) => {
        const { roomCode, myPlayerId, players } = get();
        if (!roomCode || !myPlayerId) return;

        const sender = players.find(p => p.id === myPlayerId);
        const msg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            senderId: myPlayerId,
            senderName: sender?.name || 'Player',
            content,
            timestamp: Date.now()
        };

        // Update local immediately
        set(state => ({ messages: [...state.messages, msg] }));

        // Broadcast to others
        await supabase.channel(`room:${roomCode}`).send({
            type: 'broadcast',
            event: 'chat',
            payload: msg
        });
    },

    // ... leaveGame ...

    leaveGame: async () => {
        const { myPlayerId, roomCode, isHost } = get();

        if (roomCode) {
            // Unsubscribe
            supabase.removeAllChannels();

            if (isHost) {
                // Host deletes the room (Cascade deletes players)
                await supabase.from('rooms').delete().eq('code', roomCode);
            } else if (myPlayerId) {
                // Player just leaves
                await supabase.from('players').delete().eq('id', myPlayerId);
            }
        }

        set({ roomCode: null, isHost: false, myPlayerId: null, players: [], gameStatus: 'LOBBY' });
    }
}));
