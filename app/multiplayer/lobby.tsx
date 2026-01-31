import { GameAPI } from '@/api/game';
import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
    const { roomCode, players, isHost, myPlayerId, leaveGame, gameStatus, gamePhase, removePlayer, kicked, roomDeleted } = useOnlineGameStore();
    const [copied, setCopied] = React.useState(false);

    // Handle being kicked
    React.useEffect(() => {
        if (kicked || roomDeleted) {
            showAlert(
                kicked ? "Removed From Game" : "Host Left",
                kicked ? "You have been kicked by the host." : "The host has ended the game.",
                [{
                    text: "OK",
                    onPress: () => {
                        leaveGame();
                        router.replace('/');
                    }
                }]
            );
        }
    }, [kicked, roomDeleted]);
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

    const handleCopyCode = async () => {
        if (!roomCode) return;
        await Clipboard.setStringAsync(roomCode);
        haptics.success();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleTransferHost = async (targetId: string, targetName: string) => {
        showAlert(
            "Transfer Leadership?",
            `Are you sure you want to make ${targetName} the host? You will lose host privileges.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Transfer",
                    onPress: async () => {
                        if (!myPlayerId || !roomCode) return;
                        const { error } = await GameAPI.transferHost(myPlayerId, targetId);
                        if (error) {
                            showAlert("Error", "Failed to transfer leadership: " + error.message, [{ text: "OK" }]);
                        } else {
                            haptics.success();
                        }
                    }
                }
            ]
        );
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
            {isHost && item.id !== myPlayerId && (
                <View style={styles.hostActions}>
                    <TouchableOpacity
                        onPress={() => handleTransferHost(item.id, item.name)}
                        activeOpacity={0.7}
                        style={styles.transferButton}
                    >
                        <Ionicons name="star" size={14} color={Colors.candlelight} />
                        <Text style={styles.transferButtonText}>Make Host</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => handleKick(item.id, item.name)}
                        activeOpacity={0.7}
                        style={styles.removeButton}
                    >
                        <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                </View>
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
                        <TouchableOpacity
                            style={styles.roomCodeContainer}
                            onPress={handleCopyCode}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.roomLabel}>{copied ? "COPIED!" : "ROOM CODE"}</Text>
                            <Text style={[styles.roomCode, copied && { color: Colors.success }]}>{roomCode}</Text>
                        </TouchableOpacity>
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
                        ) : null}
                    </View>
                </View>
            </LinearGradient>

            {!isHost && (
                <Animated.View entering={FadeInDown.delay(300)} style={[styles.spectatorBanner, { bottom: insets.bottom + 20 }]}>
                    <Ionicons name="time" size={16} color={Colors.candlelight} />
                    <Text style={styles.spectatorBannerText}>
                        WAITING FOR HOST TO START...
                    </Text>
                </Animated.View>
            )}

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
    hostActions: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
    },
    transferButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        gap: 4,
    },
    transferButtonText: {
        color: Colors.candlelight,
        fontSize: 12,
        fontWeight: 'bold',
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
    spectatorBanner: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(20, 20, 20, 0.95)',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 100,
    },
    spectatorBannerText: {
        color: Colors.candlelight,
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.5,
        textAlign: 'center',
    },
});
