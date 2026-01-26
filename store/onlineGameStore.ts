import { GameAPI } from '@/api/game';
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
    gamePhase: 'setup' | 'reveal' | 'discussion' | 'voting' | 'results' | null;
    gameMode: string | null;
    messages: ChatMessage[];
    unreadMessageCount: number;
    isChatOpen: boolean;
    directorWinnerId: string | null;
    gameWinner: 'crewmates' | 'imposters' | null;
    impostersCaught: boolean;
    kicked: boolean;

    // Actions
    setRoomInfo: (code: string, isHost: boolean, playerId: string, initialPlayer?: any) => void;
    setGameInfo: (status: 'LOBBY' | 'PLAYING' | 'FINISHED', mode: string, phase?: string) => void;
    setPlayerRole: (id: string, role: string) => void;
    setChatOpen: (open: boolean) => void;
    clearUnreadCount: () => void;
    syncGameState: (newState: any) => void;
    leaveGame: () => void;
    sendChatMessage: (content: string) => Promise<void>;
    removePlayer: (id: string) => void;
    resetGame: () => void;
    resetRoom: () => Promise<void>;
}

// Helper to map DB player
const mapPlayer = (p: any) => ({
    ...p,
    isHost: p.is_host,
    isImposter: p.role === 'imposter',
    score: p.score || 0,
    secretWord: p.secret_word,
    role: p.role || 'viewer', // Default to viewer if role is null to avoid issues
    vote: p.vote
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
    unreadMessageCount: 0,
    isChatOpen: false,
    directorWinnerId: null,
    gameWinner: null,
    impostersCaught: false,
    kicked: false,

    setChatOpen: (open) => set({ isChatOpen: open }),
    clearUnreadCount: () => set({ unreadMessageCount: 0 }),

    setPlayerRole: (id, role: any) => {
        set(state => ({
            players: state.players.map(p => p.id === id ? { ...p, role } : p)
        }));
    },

    setRoomInfo: (code, isHost, playerId, initialPlayer) => {
        const startPlayers = initialPlayer ? [mapPlayer(initialPlayer)] : [];
        set({ roomCode: code, isHost, myPlayerId: playerId, messages: [], players: startPlayers, unreadMessageCount: 0 });

        // 1. Fetch initial players data
        supabase
            .from('players')
            .select('*')
            .eq('room_code', code)
            .then(({ data }) => {
                if (data) {
                    set({ players: data.map(mapPlayer) });
                }
            });

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
                    const { myPlayerId } = get();
                    set(state => {
                        // Check if I am the one updated
                        let newIsHost = state.isHost;
                        if (String(payload.new.id) === String(myPlayerId)) {
                            newIsHost = payload.new.is_host;
                            console.log('My host status updated to:', newIsHost);
                        }

                        const exists = state.players.some(p => p.id === payload.new.id);
                        if (exists) {
                            return {
                                isHost: newIsHost,
                                players: state.players.map(p => p.id === payload.new.id ? mapPlayer(payload.new) : p)
                            };
                        } else {
                            return {
                                isHost: newIsHost,
                                players: [...state.players, mapPlayer(payload.new)]
                            };
                        }
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'players' },
                (payload) => {
                    const { myPlayerId, players } = get();
                    console.log('DELETE payload received:', payload);
                    const deletedId = payload.old?.id;

                    if (!deletedId) {
                        console.log('DELETE event missing ID in payload.old');
                        return;
                    }

                    console.log('Player DELETE event for ID:', deletedId, 'My ID:', myPlayerId);

                    // 1. If I am the one deleted, I was kicked
                    if (String(deletedId) === String(myPlayerId)) {
                        console.log('I have been kicked - setting kicked state to true');
                        set({ kicked: true });
                        // redirection handled in UI components
                        return;
                    }

                    // 2. Update list for everyone else
                    set(state => ({
                        players: state.players.filter(p => p.id !== deletedId)
                    }));
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
                (payload) => {
                    const newRoom = payload.new as any;
                    if (newRoom.status === 'LOBBY') {
                        // Reset everything when moving back to lobby
                        get().resetGame();
                    } else {
                        set({
                            gameStatus: newRoom.status,
                            gameMode: newRoom.game_mode,
                            gamePhase: newRoom.curr_phase
                        });
                    }
                }
            )
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                const { isChatOpen } = get();
                set(state => ({
                    messages: [...state.messages, payload],
                    unreadMessageCount: isChatOpen ? 0 : state.unreadMessageCount + 1
                }));
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

    resetGame: () => {
        set({
            gameStatus: 'LOBBY',
            gamePhase: null,
            gameMode: null,
            players: get().players.map(p => ({ ...p, role: 'viewer', vote: undefined, secretWord: undefined })),
            messages: [],
            unreadMessageCount: 0,
            directorWinnerId: null,
            gameWinner: null,
            impostersCaught: false,
            kicked: false
        });
    },

    resetRoom: async () => {
        const { roomCode } = get();
        if (roomCode) {
            try {
                await GameAPI.resetRoom(roomCode);
                // Host also resets locally immediately for responsiveness
                get().resetGame();
            } catch (error) {
                console.error('Store resetRoom error:', error);
                throw error;
            }
        }
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
                // Check if other players exist to migrate host
                const { data: others } = await supabase
                    .from('players')
                    .select('*')
                    .eq('room_code', roomCode)
                    .neq('id', myPlayerId)
                    .limit(1);

                if (others && others.length > 0) {
                    console.log('Host leaving, migrating host to:', others[0].name);
                    const newHost = others[0];

                    // 1. Assign new host
                    const { error: updateError } = await supabase
                        .from('players')
                        .update({ is_host: true })
                        .eq('id', newHost.id);

                    if (updateError) {
                        console.error('Failed to migrate host:', updateError);
                        // Fallback: Delete room if migration fails to avoid zombie room
                        await supabase.from('rooms').delete().eq('code', roomCode);
                    } else {
                        // 2. Delete myself (old host)
                        await supabase.from('players').delete().eq('id', myPlayerId);
                    }
                } else {
                    // No one left, delete room
                    await supabase.from('rooms').delete().eq('code', roomCode);
                }
            } else if (myPlayerId) {
                // Player just leaves
                await supabase.from('players').delete().eq('id', myPlayerId);
            }
        }

        set({ roomCode: null, isHost: false, myPlayerId: null, players: [], gameStatus: 'LOBBY', unreadMessageCount: 0, kicked: false });
    }
}));
