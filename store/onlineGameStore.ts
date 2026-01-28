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
    replyToId?: string;
    replyToName?: string;
    replyToContent?: string;
    // reactions?: Record<string, string>; // Removed
    seenBy?: string[]; // List of player IDs who have seen the message
}

interface OnlineGameState {
    roomCode: string | null;
    isHost: boolean;
    myPlayerId: string | null;
    players: Player[];
    gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';
    gamePhase: 'setup' | 'reveal' | 'discussion' | 'voting' | 'results' | 'SELECT_MODE' | 'SELECT_DIRECTOR' | 'SELECT_PSYCHIC' | 'SETUP_DIRECTOR:PLAYER' | 'SETUP_DIRECTOR:MOVIE' | 'SETUP_DIRECTOR:TIMER' | 'role-reveal' | 'judge' | 'PICTIONARY:SELECT_WORD' | 'PICTIONARY:DRAWING' | 'PICTIONARY:TURN_END' | 'PICTIONARY:ROUND_END' | null;
    gameMode: string | null;
    messages: ChatMessage[];
    unreadMessageCount: number;
    isChatOpen: boolean;
    directorWinnerId: string | null;
    gameWinner: 'crewmates' | 'imposters' | null;
    impostersCaught: boolean;
    kicked: boolean;
    roomDeleted: boolean;
    typingPlayers: string[];
    channel: any;
    setTyping: (isTyping: boolean) => Promise<void>;
    broadcastSelection: (selection: { type: 'mode' | 'player' | 'movie' | 'timer' | 'PICTIONARY_OPTIONS' | 'PICTIONARY_TIMER' | 'PICTIONARY_WORD_SELECTED', id: string | null, data?: any } | null) => Promise<void>;
    selection: { type: 'mode' | 'player' | 'movie' | 'timer' | 'PICTIONARY_OPTIONS' | 'PICTIONARY_TIMER' | 'PICTIONARY_WORD_SELECTED', id: string | null, data?: any } | null;
    gameData?: { type: string, data: any };

    // Actions
    setRoomInfo: (code: string, isHost: boolean, playerId: string, initialPlayer?: any) => void;
    setGameInfo: (status: 'LOBBY' | 'PLAYING' | 'FINISHED', mode: string, phase?: string) => void;
    setPlayerRole: (id: string, role: string) => void;
    setChatOpen: (open: boolean) => void;
    clearUnreadCount: () => void;
    syncGameState: (newState: any) => void;
    leaveGame: () => void;
    sendChatMessage: (content: string, replyTo?: { id: string, name: string, content: string }) => Promise<void>;
    markMessageAsSeen: (messageId: string) => Promise<void>;
    removePlayer: (id: string) => void;
    resetGame: () => void;
    resetRoom: (resetScores?: boolean) => Promise<void>;
    forceRefreshPlayers: () => Promise<void>;
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
    roomDeleted: false,
    typingPlayers: [] as string[], // List of names typing
    channel: null, // Initialize channel
    selection: null,

    broadcastSelection: async (selection) => {
        const { channel } = get();
        if (!channel) return; // Ensure channel is available
        await channel.send({
            type: 'broadcast',
            event: 'selection',
            payload: { selection }
        });
        // Also update local for host
        set({ selection });
    },

    setTyping: async (isTyping: boolean) => {
        const { roomCode, myPlayerId } = get();
        if (!roomCode || !myPlayerId) return;

        await supabase.channel(`room:${roomCode}`).send({
            type: 'broadcast',
            event: 'typing',
            payload: { playerId: myPlayerId, isTyping }
        });
    },

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
        set({ channel });

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

                            // FAILSAFE: If I am reset to 'viewer' while game is FINISHED, it means a reset happened
                            // and we might have missed the room update or broadcast.
                            if (payload.new.role === 'viewer' && state.gameStatus === 'FINISHED') {
                                console.log('Player role reset to viewer in FINISHED state - triggering local reset');
                                // Defer to avoid state update conflict within set? 
                                // Zustand set can be nested but safe to request next tick or just update duplicated state
                                // We can just call get().resetGame() outside set? No, we are inside set callback.
                                // We can return the new state here implies we can't call side effects easily.
                                // Actually we can just update the state directly here:
                                return {
                                    isHost: newIsHost,
                                    players: state.players.map(p => p.id === payload.new.id ? mapPlayer(payload.new) : p),
                                    gameStatus: 'LOBBY', // Force Lobby
                                    gamePhase: null,
                                    gameMode: null,
                                    gameData: undefined,
                                    // We should also clear votes/etc but mapPlayer does that if payload is fresh
                                };
                            }
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

                    // Check for insufficient players
                    const { isHost, gameStatus, players: newPlayers } = get();
                    if (isHost && gameStatus === 'PLAYING' && newPlayers.length < 2) {
                        console.log('Insufficient players (<2) detected. Resetting to LOBBY.');
                        get().resetRoom();
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
                (payload) => {
                    const newRoom = payload.new as any;
                    console.log('Room UPDATE received:', newRoom);

                    // Always sync these values
                    set({
                        gameStatus: newRoom.status,
                        gameMode: newRoom.game_mode,
                        gamePhase: newRoom.curr_phase,
                        gameData: newRoom.game_data
                    });

                    if (newRoom.status === 'LOBBY' && !newRoom.curr_phase) {
                        // If we are back in LOBBY with NO phase, then it's a full reset (e.g. Play Again)
                        // But don't call resetGame() blindly as it might wipe SELECT_MODE
                        set(state => ({
                            players: state.players.map(p => ({ ...p, role: 'viewer', vote: undefined, secretWord: undefined })),
                            messages: [],
                            unreadMessageCount: 0,
                            directorWinnerId: null,
                            gameWinner: null,
                            impostersCaught: false,
                            kicked: false
                        }));
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
                () => {
                    console.log('Room has been deleted by the host');
                    set({ roomDeleted: true });
                }
            )
            .on('broadcast', { event: 'chat' }, ({ payload }) => {
                const { isChatOpen } = get();
                set(state => ({
                    messages: [...state.messages, payload],
                    unreadMessageCount: isChatOpen ? 0 : state.unreadMessageCount + 1
                }));
            })
            .on('broadcast', { event: 'selection' }, ({ payload }) => {
                set({ selection: payload.selection });
            })
            .on('broadcast', { event: 'seen' }, ({ payload }) => {
                const { messageId, playerId } = payload;
                if (playerId === get().myPlayerId) return; // Ignore own seen events (already handled optimistically)

                set(state => ({
                    messages: state.messages.map(m => {
                        if (m.id === messageId) {
                            const seenBy = m.seenBy || [];
                            if (!seenBy.includes(playerId)) {
                                return { ...m, seenBy: [...seenBy, playerId] };
                            }
                        }
                        return m;
                    })
                }));
            })
            .on('broadcast', { event: 'typing' }, ({ payload }) => {
                const { playerId, isTyping } = payload;
                const { myPlayerId, players } = get();
                if (playerId === myPlayerId) return;

                const name = players.find(p => p.id === playerId)?.name;
                if (!name) return;

                set(state => {
                    const currentTyping = new Set(state.typingPlayers);
                    if (isTyping) currentTyping.add(name);
                    else currentTyping.delete(name);
                    return { typingPlayers: Array.from(currentTyping) };
                });
            })
            .on('broadcast', { event: 'reset' }, () => {
                console.log('Received RESET broadcast - resetting game locally');
                get().resetGame();
            })
            .on('presence', { event: 'sync' }, () => {
                const presenceState = channel.presenceState();
                const onlinePlayerIds = Object.values(presenceState).flat().map((p: any) => String(p.id));

                const { isHost, players, gameStatus, myPlayerId, roomCode } = get();
                if (!roomCode) return;

                // 1. Client Logic: Watch Host
                if (!isHost) {
                    const host = players.find(p => p.isHost);
                    if (host && !onlinePlayerIds.includes(String(host.id))) {
                        console.log('Host presence lost. Waiting to see if they reconnect...');
                        // Wait 5 seconds to account for refreshes or brief disconnects
                        setTimeout(() => {
                            const { players: currentPlayers, isHost: amIHost, roomCode: currentRoom } = get();
                            if (amIHost || !currentRoom) return; // If I became host, stop tracking.

                            const currentHost = currentPlayers.find(p => p.isHost);
                            // If no host exists in store, maybe still syncing or really gone. 
                            // If currentHost is different from captured 'host', migration happened.

                            const latestPresence = channel.presenceState();
                            const latestOnlineIds = Object.values(latestPresence).flat().map((p: any) => String(p.id));

                            // Only delete if the CURRENT host is missing, and verify I'm still not the host
                            if (currentHost && !latestOnlineIds.includes(String(currentHost.id))) {
                                console.log('Host confirmed offline. Terminating room.');

                                if (gameStatus !== 'LOBBY') {
                                    // Game in progress/finished -> delete room
                                    GameAPI.deleteRoom(currentRoom).catch(e => console.error('Auto-delete room error', e));
                                    set({ roomDeleted: true });
                                } else {
                                    // Lobby -> delete room (host abandoned)
                                    GameAPI.deleteRoom(currentRoom).catch(e => console.error('Auto-delete room error', e));
                                    set({ roomDeleted: true });
                                }
                            }
                        }, 5000);
                    }
                }

                // 2. Host Logic: Watch Players (Ghost Cleanup)
                if (isHost) {
                    const ghosts = players.filter(p => !p.isHost && !onlinePlayerIds.includes(p.id));
                    if (ghosts.length > 0) {
                        // Wait 5s to confirm they are gone (not just refreshing)
                        setTimeout(async () => {
                            const { players: currentPlayers, isHost: amIStillHost } = get();
                            if (!amIStillHost) return;

                            const latestPresence = channel.presenceState();
                            const latestOnlineIds = Object.values(latestPresence).flat().map((p: any) => String(p.id));

                            // Identify confirmed ghosts
                            const confirmedGhosts = currentPlayers.filter(p => !p.isHost && !latestOnlineIds.includes(p.id));

                            for (const ghost of confirmedGhosts) {
                                console.log('Host removing ghost player:', ghost.name);
                                // We use leaveRoom to remove them from DB. 
                                // This will trigger 'DELETE' subscription for everyone else to update UI.
                                await GameAPI.leaveRoom(ghost.id);
                            }
                        }, 5000);
                    }
                }
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ id: playerId });
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
            kicked: false,
            roomDeleted: false,
            gameData: undefined,
        });
    },

    resetRoom: async (resetScores = false) => {
        const { roomCode } = get();
        if (roomCode) {
            try {
                await GameAPI.resetRoom(roomCode, resetScores);

                // Broadcast 'reset' event to ensure clients with large DB payloads (like Pictionary) still get the trigger
                // as Postgres NOTIFY might drop events > 8KB.
                const { channel } = get();
                if (channel) {
                    await channel.send({
                        type: 'broadcast',
                        event: 'reset',
                        payload: {}
                    });
                }

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

    sendChatMessage: async (content: string, replyTo) => {
        const { roomCode, myPlayerId, players } = get();
        if (!roomCode || !myPlayerId) return;

        const sender = players.find(p => p.id === myPlayerId);
        const msg: ChatMessage = {
            id: Math.random().toString(36).substring(2, 9),
            senderId: myPlayerId,
            senderName: sender?.name || 'Player',
            content,
            timestamp: Date.now(),
            replyToId: replyTo?.id,
            replyToName: replyTo?.name,
            replyToContent: replyTo?.content,
            seenBy: []
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

    markMessageAsSeen: async (messageId: string) => {
        const { roomCode, myPlayerId } = get();
        if (!roomCode || !myPlayerId) return;

        // Optimistic update
        set(state => ({
            messages: state.messages.map(m => {
                if (m.id === messageId) {
                    const seenBy = m.seenBy || [];
                    if (!seenBy.includes(myPlayerId)) {
                        return { ...m, seenBy: [...seenBy, myPlayerId] };
                    }
                }
                return m;
            })
        }));

        // Broadcast
        await supabase.channel(`room:${roomCode}`).send({
            type: 'broadcast',
            event: 'seen',
            payload: { messageId, playerId: myPlayerId }
        });
    },

    // ... leaveGame ...

    leaveGame: async () => {
        const { myPlayerId, roomCode, isHost, gameStatus } = get();

        if (roomCode) {
            // Unsubscribe
            supabase.removeAllChannels();

            if (isHost) {
                if (gameStatus === 'LOBBY') {
                    // Check if other players exist to migrate host
                    const { data: others } = await supabase
                        .from('players')
                        .select('*')
                        .eq('room_code', roomCode)
                        .neq('id', myPlayerId)
                        .limit(1);

                    if (others && others.length > 0) {
                        console.log('Host leaving LOBBY, migrating host to:', others[0].name);
                        const newHost = others[0];

                        // 1. Assign new host
                        const { error: updateError } = await supabase
                            .from('players')
                            .update({ is_host: true })
                            .eq('id', newHost.id);

                        if (updateError) {
                            console.error('Failed to migrate host:', updateError);
                            // Fallback: Delete room if migration fails
                            await GameAPI.deleteRoom(roomCode);
                        } else {
                            // 2. Delete myself (old host)
                            await supabase.from('players').delete().eq('id', myPlayerId);
                        }
                    } else {
                        // No one left, delete room
                        await GameAPI.deleteRoom(roomCode);
                    }
                } else {
                    // If game is in progress or finished, terminate room entirely
                    console.log('Host leaving during game/results, terminating room:', roomCode);
                    await GameAPI.deleteRoom(roomCode);
                }
            } else if (myPlayerId) {
                // Player just leaves
                await supabase.from('players').delete().eq('id', myPlayerId);

                // Check if room is effectively empty (or only has ghosts)
                // We check if 0 players remain.
                const { count } = await supabase
                    .from('players')
                    .select('*', { count: 'exact', head: true })
                    .eq('room_code', roomCode);

                if (count === 0) {
                    console.log('Last player left, deleting room:', roomCode);
                    await GameAPI.deleteRoom(roomCode);
                }
            }
        }

        set({ roomCode: null, isHost: false, myPlayerId: null, players: [], gameStatus: 'LOBBY', unreadMessageCount: 0, kicked: false, roomDeleted: false });
    },

    forceRefreshPlayers: async () => {
        const { roomCode } = get();
        if (!roomCode) return;
        const { data } = await supabase.from('players').select('*').eq('room_code', roomCode);
        if (data) {
            set({ players: data.map(mapPlayer) });
        }
    }
}));
