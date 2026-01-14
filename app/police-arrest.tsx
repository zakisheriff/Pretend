import { GenericModal } from '@/components/common/GenericModal';
import { Button, WinnerCelebration } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { Player, ThiefPoliceData } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WINNING_SCORE = 10;

export default function PoliceArrestScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const gameData = useGameStore((s) => s.gameData);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [showHomeConfirm, setShowHomeConfirm] = useState(false);
    const [overallWinner, setOverallWinner] = useState<Player | null>(null);

    // Get thief-police data
    const data = gameData?.type === 'thief-police' ? gameData.data as ThiefPoliceData : null;
    if (!data) return null;

    const policePlayer = players.find(p => p.id === data.policePlayerId);
    const thiefPlayer = players.find(p => p.id === data.thiefPlayerId);

    // Exclude Police from selection (Police can't arrest themselves)
    const selectablePlayers = players.filter(p => p.id !== data.policePlayerId);

    const handleArrest = () => {
        if (!selectedId) return;
        haptics.heavy();
        setRevealed(true);
    };

    const isCaught = selectedId === data.thiefPlayerId;

    const handlePlayAgain = () => {
        haptics.success();

        // Distribute points
        const updatedPlayers = players.map(p => {
            let points = 0;
            if (isCaught) {
                // Police caught Thief: Police +1, Civilians +1, Thief +0
                if (p.id === data.policePlayerId) points = 1;
                else if (p.id !== data.thiefPlayerId) points = 1;
            } else {
                // Police failed: Thief +2, others +0
                if (p.id === data.thiefPlayerId) points = 2;
            }
            return { ...p, score: p.score + points };
        });

        // Check for overall winner (first to WINNING_SCORE)
        const winner = updatedPlayers.find(p => p.score >= WINNING_SCORE);

        useGameStore.getState().reorderPlayers(updatedPlayers);

        if (winner) {
            // Someone won the tournament!
            setOverallWinner(winner);
        } else {
            // Navigate to select mode
            router.replace('/select-mode');
        }
    };

    const handleHomeConfirm = () => {
        haptics.medium();
        setShowHomeConfirm(false);

        // Distribute points
        const updatedPlayers = players.map(p => {
            let points = 0;
            if (isCaught) {
                if (p.id === data.policePlayerId) points = 1;
                else if (p.id !== data.thiefPlayerId) points = 1;
            } else {
                if (p.id === data.thiefPlayerId) points = 2;
            }
            return { ...p, score: p.score + points };
        });

        useGameStore.getState().reorderPlayers(updatedPlayers);
        useGameStore.getState().resetGame();

        router.replace('/');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            {!revealed ? (
                <>
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.header}>
                        <View style={styles.policeBadge}>
                            <Ionicons name="shield-checkmark" size={28} color={Colors.detective} />
                        </View>
                        <Text style={styles.title}>Police Makes Arrest</Text>
                        <Text style={styles.subtitle}>Pass to {policePlayer?.name || 'Police'}</Text>
                    </Animated.View>

                    <View style={styles.playersContainer}>
                        <Text style={styles.sectionLabel}>SELECT SUSPECT</Text>
                        <View style={styles.playerGrid}>
                            {selectablePlayers.map((player, index) => (
                                <Animated.View
                                    key={player.id}
                                    entering={FadeInDown.delay(200 + index * 50)}
                                >
                                    <Pressable
                                        onPress={() => {
                                            haptics.selection();
                                            setSelectedId(player.id);
                                        }}
                                        style={[
                                            styles.playerCard,
                                            selectedId === player.id && styles.playerCardSelected
                                        ]}
                                    >
                                        <View style={[
                                            styles.playerAvatar,
                                            selectedId === player.id && styles.playerAvatarSelected
                                        ]}>
                                            <Text style={styles.avatarLetter}>
                                                {player.name.charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={[
                                            styles.playerName,
                                            selectedId === player.id && styles.playerNameSelected
                                        ]}>
                                            {player.name}
                                        </Text>
                                        {selectedId === player.id && (
                                            <View style={styles.checkMark}>
                                                <Ionicons name="checkmark-circle" size={20} color={Colors.detective} />
                                            </View>
                                        )}
                                    </Pressable>
                                </Animated.View>
                            ))}
                        </View>
                    </View>

                    <Button
                        title="Arrest Suspect"
                        onPress={handleArrest}
                        variant="primary"
                        size="large"
                        disabled={!selectedId}
                        icon={<Ionicons name="hand-left" size={18} color={selectedId ? Colors.victorianBlack : Colors.grayMedium} />}
                    />
                </>
            ) : (
                <Animated.View entering={ZoomIn} style={styles.revealContainer}>
                    <View style={[styles.resultBadge, isCaught ? styles.resultSuccess : styles.resultFail]}>
                        <Ionicons
                            name={isCaught ? "checkmark-circle" : "close-circle"}
                            size={48}
                            color={isCaught ? Colors.success : Colors.suspect}
                        />
                    </View>

                    <Text style={[styles.resultTitle, isCaught ? styles.resultTitleSuccess : styles.resultTitleFail]}>
                        {isCaught ? "THIEF CAUGHT!" : "THIEF ESCAPED!"}
                    </Text>

                    <View style={styles.revealCard}>
                        <Text style={styles.revealLabel}>The Thief was</Text>
                        <View style={styles.thiefReveal}>
                            <View style={styles.thiefAvatar}>
                                <Text style={styles.thiefAvatarLetter}>
                                    {thiefPlayer?.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={styles.thiefName}>{thiefPlayer?.name}</Text>
                        </View>
                    </View>

                    <View style={styles.pointsBox}>
                        <Text style={styles.pointsTitle}>Round Results</Text>
                        {players.map((player) => {
                            const isPolice = player.id === data.policePlayerId;
                            const isThief = player.id === data.thiefPlayerId;
                            let points = 0;
                            if (isCaught) {
                                if (isPolice) points = 1;
                                else if (!isThief) points = 1;
                            } else {
                                if (isThief) points = 2;
                            }

                            return (
                                <View key={player.id} style={styles.playerResultRow}>
                                    <View style={styles.playerResultLeft}>
                                        <Ionicons
                                            name={isPolice ? "shield-checkmark" : isThief ? "finger-print" : "person"}
                                            size={18}
                                            color={isPolice ? Colors.detective : isThief ? Colors.suspect : Colors.candlelight}
                                        />
                                        <Text style={styles.playerResultName}>{player.name}</Text>
                                        <Text style={[styles.playerResultRole,
                                        isPolice && { color: Colors.detective },
                                        isThief && { color: Colors.suspect }
                                        ]}>
                                            {isPolice ? 'Police' : isThief ? 'Thief' : 'Civilian'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.playerResultPoints, points > 0 && styles.playerResultPointsGained]}>
                                        {points > 0 ? `+${points}` : '0'}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>

                    <View style={styles.buttonRow}>
                        <Button
                            title="Play Again"
                            onPress={handlePlayAgain}
                            variant="primary"
                            size="large"
                            style={{ flex: 1 }}
                            icon={<Ionicons name="refresh" size={18} color={Colors.victorianBlack} />}
                        />
                        <Button
                            title="Home"
                            onPress={() => setShowHomeConfirm(true)}
                            variant="outline"
                            size="large"
                            style={{ flex: 1 }}
                            icon={<Ionicons name="home" size={18} color={Colors.candlelight} />}
                        />
                    </View>
                </Animated.View>
            )}

            <GenericModal
                visible={showHomeConfirm}
                title="End Game?"
                message="This will end the current game and return to home. All progress will be lost."
                confirmLabel="Yes"
                isDestructive
                onConfirm={handleHomeConfirm}
                onCancel={() => setShowHomeConfirm(false)}
            />

            {/* Overall Winner Celebration - when someone reaches 10 points */}
            {overallWinner && (
                <WinnerCelebration
                    winner={overallWinner}
                    allPlayers={players}
                    onNewGame={() => {
                        useGameStore.getState().resetTournament();
                        router.replace('/select-mode');
                    }}
                    onHome={() => {
                        useGameStore.getState().resetToHome();
                        router.replace('/');
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    policeBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(44, 130, 201, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: Colors.detective,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.parchment,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.candlelight,
        marginTop: 4,
        fontStyle: 'italic',
    },
    playersContainer: {
        flex: 1,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.grayLight,
        letterSpacing: 3,
        textAlign: 'center',
        marginBottom: 16,
    },
    playerGrid: {
        gap: 12,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.grayDark,
        borderRadius: 16,
        padding: 14,
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        gap: 14,
    },
    playerCardSelected: {
        borderColor: Colors.detective,
        backgroundColor: 'rgba(44, 130, 201, 0.1)',
    },
    playerAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playerAvatarSelected: {
        backgroundColor: Colors.detective,
    },
    avatarLetter: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.parchment,
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.parchment,
        flex: 1,
    },
    playerNameSelected: {
        color: Colors.detective,
    },
    checkMark: {
        marginLeft: 'auto',
    },
    // Reveal styles
    revealContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
    },
    resultBadge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
    },
    resultSuccess: {
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: Colors.success,
    },
    resultFail: {
        backgroundColor: 'rgba(160, 32, 32, 0.2)',
        borderColor: Colors.suspect,
    },
    resultTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2,
    },
    resultTitleSuccess: {
        color: Colors.success,
    },
    resultTitleFail: {
        color: Colors.suspect,
    },
    revealCard: {
        backgroundColor: Colors.grayDark,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        width: '100%',
    },
    revealLabel: {
        fontSize: 12,
        color: Colors.grayLight,
        letterSpacing: 2,
        marginBottom: 12,
    },
    thiefReveal: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    thiefAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.suspect,
        alignItems: 'center',
        justifyContent: 'center',
    },
    thiefAvatarLetter: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.parchment,
    },
    thiefName: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.parchment,
    },
    pointsBox: {
        backgroundColor: 'rgba(196, 167, 108, 0.1)',
        borderRadius: 16,
        padding: 16,
        width: '100%',
        borderWidth: 1,
        borderColor: Colors.candlelight,
    },
    pointsTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.candlelight,
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 12,
    },
    pointsLine: {
        fontSize: 14,
        color: Colors.parchment,
        marginVertical: 2,
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 4,
    },
    playerResultRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: Colors.grayDark,
        borderRadius: 12,
        marginVertical: 4,
    },
    playerResultLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    playerResultName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.parchment,
    },
    playerResultRole: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.grayLight,
        marginLeft: 4,
    },
    playerResultPoints: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.grayLight,
        minWidth: 30,
        textAlign: 'right',
    },
    playerResultPointsGained: {
        color: Colors.success,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
});
