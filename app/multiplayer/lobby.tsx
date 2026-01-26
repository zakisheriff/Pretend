import { GameAPI } from '@/api/game';
import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LobbyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showAlert, AlertComponent } = useCustomAlert();
    const { roomCode, players, isHost, leaveGame, gameStatus, gamePhase, removePlayer, kicked } = useOnlineGameStore();

    // Handle being kicked
    React.useEffect(() => {
        if (kicked) {
            showAlert(
                "Removed From Game",
                "You have been kicked by the host.",
                [{
                    text: "OK",
                    onPress: () => {
                        leaveGame();
                        router.replace('/');
                    }
                }]
            );
        }
    }, [kicked]);
    // chatVisible removed

    // Check DB Permissions
    React.useEffect(() => {
        GameAPI.checkConnection().then(ok => {
            if (!ok) {
                showAlert(
                    "Database Setup Required",
                    "Database permissions are blocking the game. Please run the 'SUPABASE_SETUP.sql' script in your Supabase Dashboard SQL Editor.",
                    [{ text: "OK" }]
                );
            }
        });
    }, []);

    // Effect to navigate when game starts or setup phase changes
    React.useEffect(() => {
        if (gameStatus === 'PLAYING') {
            router.push('/multiplayer/game' as any);
        } else if (gamePhase === 'SELECT_MODE') {
            router.push('/multiplayer/select-mode' as any);
        } else if (gamePhase?.startsWith('SETUP_DIRECTOR')) {
            router.push('/setup-director' as any);
        }
    }, [gameStatus, gamePhase]);

    const handleLeave = () => {
        showAlert(
            "Leave Lobby?",
            "Are you sure you want to leave the lobby?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: () => {
                        leaveGame();
                        router.dismissTo('/');
                    }
                }
            ]
        );
    };

    const handleStartGame = () => {
        router.push('/multiplayer/select-mode');
    };

    const handleKick = async (playerId: string, playerName: string) => {
        console.log('handleKick called for:', playerName, playerId);
        showAlert(
            "Remove Player",
            `Are you sure you want to remove ${playerName} from the lobby?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        console.log('Confirm remove pressed for:', playerId);
                        // Optimistic update
                        removePlayer(playerId);

                        const { error } = await GameAPI.leaveRoom(playerId);
                        if (error) {
                            console.error('Kick error:', error);
                            const msg = error.message === 'RLS_BLOCK'
                                ? "Supabase is blocking the host from deleting other players. Please run the SQL fix in the walkthrough."
                                : "Failed to remove player: " + error.message;
                            showAlert("Database Permission Error", msg, [{ text: "OK" }]);
                        } else {
                            console.log('Player removed from DB successfully');
                        }
                    }
                }
            ]
        );
    };

    const renderPlayer = ({ item, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()} style={styles.playerCard}>
            <View style={styles.playerAvatar}>
                <Ionicons name="person" size={20} color={Colors.victorianBlack} />
            </View>
            <Text style={styles.playerName}>
                {item.name} {item.isHost && <Text style={styles.hostBadge}>(Host)</Text>}
            </Text>
            {item.id === useOnlineGameStore.getState().myPlayerId && (
                <View style={styles.meBadge}>
                    <Text style={styles.meText}>YOU</Text>
                </View>
            )}
            {isHost && item.id !== useOnlineGameStore.getState().myPlayerId && (
                <TouchableOpacity
                    onPress={(e) => {
                        e.preventDefault && e.preventDefault();
                        e.stopPropagation && e.stopPropagation();
                        console.log('REMOVE BUTTON TAPPED (Web fixed) for:', item.name);
                        handleKick(item.id, item.name);
                    }}
                    activeOpacity={0.7}
                    style={[styles.removeButton, { zIndex: 999 }]}
                >
                    <Text style={styles.removeButtonText}>Remove</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#0A0A0A', '#000000']}
                style={styles.gradient}
            >
                <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Button
                            title=""
                            onPress={handleLeave}
                            variant="ghost"
                            size="small"
                            icon={<Ionicons name="close" size={24} color={Colors.parchment} />}
                            style={styles.backButton}
                        />
                        <View style={styles.roomCodeContainer}>
                            <Text style={styles.roomLabel}>ROOM CODE</Text>
                            <Text style={styles.roomCode}>{roomCode}</Text>
                        </View>
                        <View style={{ width: 44 }} />
                    </View>

                    <Text style={styles.subtitle}>Waiting for players...</Text>

                    <FlatList
                        data={players}
                        renderItem={renderPlayer}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>No players yet</Text>
                        }
                    />

                    <View style={styles.footer}>
                        {isHost ? (
                            <Button
                                title={`Start Game with ${players.length} Players`}
                                onPress={handleStartGame}
                                variant="primary"
                                size="large"
                                disabled={players.length < 2} // Min players rule
                                icon={<Ionicons name="play" size={20} color={Colors.victorianBlack} />}
                                style={styles.actionButton}
                            />
                        ) : (
                            <Text style={styles.waitingText}>Waiting for host to start...</Text>
                        )}
                    </View>
                </View>
            </LinearGradient>
            <AlertComponent />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    gradient: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: { width: 44, height: 44, borderRadius: 22, paddingHorizontal: 0 },
    chatButton: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center', justifyContent: 'center'
    },

    roomCodeContainer: {
        alignItems: 'center',
        backgroundColor: 'rgba(196, 167, 108, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(196, 167, 108, 0.3)',
    },
    roomLabel: {
        fontSize: 10,
        color: Colors.grayLight,
        fontWeight: '700',
        letterSpacing: 2,
    },
    roomCode: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.parchment,
        letterSpacing: 4,
    },

    subtitle: {
        fontSize: 14,
        color: Colors.candlelight,
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },

    listContent: {
        gap: 12,
        paddingBottom: 100,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.grayDark,
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        gap: 12,
    },
    playerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.candlelight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerName: {
        fontSize: 16,
        color: Colors.parchment,
        fontWeight: '700',
        flex: 1,
    },
    removeButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.3)',
        // @ts-ignore
        cursor: 'pointer',
    },
    removeButtonText: {
        color: '#FF4444',
        fontSize: 12,
        fontWeight: 'bold',
    },
    hostBadge: {
        fontSize: 12,
        color: Colors.grayLight,
        fontWeight: '500',
    },
    meBadge: {
        backgroundColor: 'rgba(196, 167, 108, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.candlelight,
    },
    meText: {
        fontSize: 10,
        color: Colors.candlelight,
        fontWeight: '800',
    },
    emptyText: {
        textAlign: 'center',
        color: Colors.grayLight,
        marginTop: 40,
    },

    footer: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    actionButton: { width: '100%' },
    waitingText: {
        textAlign: 'center',
        color: Colors.grayLight,
        fontSize: 14,
        letterSpacing: 1,
        animationName: 'pulse', // Placeholder for animation
    },
});
