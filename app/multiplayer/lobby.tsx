import { GameAPI } from '@/api/game';
import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LobbyScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showAlert, AlertComponent } = useCustomAlert();
    const { roomCode, players, isHost, leaveGame, gameStatus, removePlayer } = useOnlineGameStore();
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

    // Effect to navigate when game starts
    React.useEffect(() => {
        if (gameStatus === 'PLAYING') {
            router.push('/multiplayer/game' as any);
        }
    }, [gameStatus]);

    const handleLeave = () => {
        leaveGame();
        router.dismissTo('/');
    };

    const handleStartGame = () => {
        router.push('/multiplayer/select-mode');
    };

    const handleKick = async (playerId: string, playerName: string) => {
        showAlert(
            "Remove Player",
            `Are you sure you want to remove ${playerName}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Remove",
                    style: "destructive",
                    onPress: async () => {
                        // Optimistic update
                        removePlayer(playerId);

                        const { error } = await GameAPI.leaveRoom(playerId);
                        if (error) {
                            showAlert("Error", "Failed to remove player from DB: " + error.message);
                            // If failed, they might reappear on next fetch/sync
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
                <Button
                    title=""
                    onPress={() => handleKick(item.id, item.name)}
                    variant="ghost"
                    size="small"
                    icon={<Ionicons name="close-circle-outline" size={24} color="#FF4444" />}
                    style={{ width: 40, height: 40, paddingHorizontal: 0 }}
                />
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
                                title={`Start Game (${players.length})`}
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
