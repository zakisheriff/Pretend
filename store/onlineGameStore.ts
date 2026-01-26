
import { supabase } from '@/lib/supabase';
import { Player } from '@/types/game';
import { create } from 'zustand';

interface OnlineGameState {
    roomCode: string | null;
    isHost: boolean;
    myPlayerId: string | null;
    players: Player[];
    gameStatus: 'LOBBY' | 'PLAYING' | 'FINISHED';

    // Actions
    setRoomInfo: (code: string, isHost: boolean, playerId: string) => void;
    syncGameState: (newState: any) => void;
    leaveGame: () => void;
}

export const useOnlineGameStore = create<OnlineGameState>((set, get) => ({
    roomCode: null,
    isHost: false,
    myPlayerId: null,
    players: [],
    gameStatus: 'LOBBY',

    setRoomInfo: (code, isHost, playerId) => {
        set({ roomCode: code, isHost, myPlayerId: playerId });

        // 1. Fetch initial players
        supabase
            .from('players')
            .select('*')
            .eq('room_code', code)
            .then(({ data }) => {
                if (data) {
                    const mappedPlayers = data.map((p: any) => ({
                        ...p,
                        isHost: p.is_host,
                        isImposter: p.role !== 'crewmate',
                        imposterCount: 0,
                        consecutiveImposterCount: 0,
                        hasRevealed: false,
                        score: p.score || 0,
                        secretWord: p.secret_word
                    }));
                    set({ players: mappedPlayers });
                }
            });

        // 2. Subscribe to changes
        supabase.channel(`room:${code}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${code}` },
                () => {
                    // Refetch all players on any change
                    supabase
                        .from('players')
                        .select('*')
                        .eq('room_code', code)
                        .then(({ data }) => {
                            if (data) {
                                const mappedPlayers = data.map((p: any) => ({
                                    ...p,
                                    isHost: p.is_host,
                                    isImposter: p.role !== 'crewmate',
                                    score: p.score || 0,
                                    secretWord: p.secret_word
                                }));
                                set({ players: mappedPlayers });
                            }
                        });
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `code=eq.${code}` },
                (payload) => {
                    const newRoom = payload.new as any;
                    if (newRoom.status) {
                        set({ gameStatus: newRoom.status });
                    }
                }
            )
            .subscribe();
    },

    syncGameState: (newState) => {
        set({ ...newState });
    },

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
