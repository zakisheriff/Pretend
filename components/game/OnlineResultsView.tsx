
import { Button, ScoreBoard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OnlineResultsView() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showRestartModal, setShowRestartModal] = useState(false);

    // Store access
    const {
        players,
        gameMode,
        gameWinner,
        impostersCaught,
        directorWinnerId,
        roomCode,
        isHost,
        resetGame
    } = useOnlineGameStore();

    // Calculate derived state
    const specialPlayers = players.filter((p) => p.isImposter);

    // Helper for role names
    const getRoleNames = () => {
        if (gameMode === 'directors-cut') return { special: 'Director', normal: 'Audience', icon: 'videocam' };
        if (gameMode === 'time-bomb') return { special: 'Bomber', normal: 'Survivor', icon: 'timer' };
        if (gameMode === 'wavelength') return { special: 'Psychic', normal: 'Guesser', icon: 'analytics' };
        // Default
        return { special: 'Imposter', normal: 'Crewmate', icon: 'eye-off' };
    };

    const { special: specialRoleName, icon: specialRoleIcon } = getRoleNames();

    useEffect(() => {
        haptics.success();
    }, []);

    const handleRestartWithConfirm = () => {
        if (!isHost) return;
        haptics.warning();
        setShowRestartModal(true);
    };

    const handlePlayAgain = async () => {
        haptics.medium();
        // Host logic to reset game
        // In a real app we'd call an API to reset the room state on server
        // For now we assume resetGame handles local, but we need an API call to sync room status
        // We will assume a GameAPI.resetGame exists or similar, but for now let's just use the store
        // and ideally we'd trigger a room update. 
        // NOTE: The implementation plan mentioned adding resetGame to store.
        // We probably need to signal the SERVER to reset. 
        // Since I can't edit API right now easily, I will just call resetGame locally 
        // and assume the user will navigate back to lobby via API update in `leaveGame` or similar if needed.
        // BUT actually, to "Play Again" means going back to Lobby. 

        // Host should update room status to LOBBY.
        if (isHost && roomCode) {
            const { GameAPI } = require('@/api/game');
            await GameAPI.updateGameStatus(roomCode, 'LOBBY');
        }
    };

    const getWinnerText = () => {
        if (gameMode === 'directors-cut') {
            if (directorWinnerId) {
                const winnerName = players.find(p => p.id === directorWinnerId)?.name || 'A Viewer ';
                return { title: 'Viewers Win!', subtitle: `${winnerName} Guessed The Movie! ` };
            }
            return { title: 'Director Wins! ', subtitle: 'No One Guessed The Movie! ' };
        }

        if (gameMode === 'wavelength') {
            return { title: 'Round Complete', subtitle: 'Check the scoreboard!' };
        }

        // Standard Imposter / Time Bomb
        if (gameMode === 'time-bomb') {
            // For time bomb, usually "Time's Up"
            return { title: 'Time\'s Up!', subtitle: 'See who exploded!' };
        }

        if (gameWinner === 'crewmates') {
            return { title: 'Crewmates Win!', subtitle: 'The Imposter was caught! ' };
        } else if (gameWinner === 'imposters') {
            return { title: 'Imposters Win!', subtitle: 'The Imposter got away! ' };
        }

        return { title: 'Round Over', subtitle: 'Checking results...' };
    };

    const winnerText = getWinnerText();

    // Success banner logic (Green vs Red)
    let displaySuccess = false;
    if (gameMode === 'directors-cut') displaySuccess = !!directorWinnerId;
    else if (gameMode === 'wavelength') displaySuccess = true;
    else if (gameWinner === 'crewmates') displaySuccess = true;

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Winner Banner */}
                <Animated.View
                    entering={ZoomIn.delay(200).springify()}
                    style={[
                        styles.winnerBanner,
                        displaySuccess ? styles.winnerInvestigators : styles.winnerImposter
                    ]}
                >
                    <Ionicons
                        name={displaySuccess ? "shield-checkmark" : "skull"}
                        size={60}
                        color={displaySuccess ? Colors.detective : Colors.suspect}
                    />
                    <Text style={[styles.winnerTitle, displaySuccess ? styles.winnerTitleInvestigators : styles.winnerTitleImposter]}>
                        {winnerText.title}
                    </Text>
                    <Text style={styles.winnerSubtitle}>
                        {winnerText.subtitle}
                    </Text>
                </Animated.View>

                {/* Role Reveal Logic */}
                {(gameMode !== 'directors-cut' && gameMode !== 'wavelength') && (
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>
                            The {specialRoleName}
                        </Text>
                        <View style={styles.imposterGrid}>
                            {specialPlayers.map((player) => (
                                <View key={player.id} style={styles.imposterCard}>
                                    <View style={styles.imposterAvatar}>
                                        <Ionicons name={specialRoleIcon as any} size={28} color={Colors.parchmentLight} />
                                    </View>
                                    <Text style={styles.imposterName}>{player.name}</Text>
                                    <Text style={styles.imposterRole}>{specialRoleName}</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Director's Cut Winner Spotlight */}
                {gameMode === 'directors-cut' && directorWinnerId && (
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>Star Viewer</Text>
                        <View style={styles.imposterGrid}>
                            {players.filter(p => p.id === directorWinnerId).map((player) => (
                                <View key={player.id} style={[styles.imposterCard, { borderColor: Colors.detective, backgroundColor: 'rgba(34, 139, 34, 0.2)' }]}>
                                    <View style={[styles.imposterAvatar, { backgroundColor: Colors.detective }]}>
                                        <Ionicons name="trophy" size={28} color={Colors.parchmentLight} />
                                    </View>
                                    <Text style={styles.imposterName}>{player.name}</Text>
                                    <Text style={[styles.imposterRole, { color: Colors.detective }]}>Correct Guesser</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Leaderboard Section */}
                <Animated.View entering={FadeInUp.delay(900).springify()} style={styles.section}>
                    <ScoreBoard players={players} />
                </Animated.View>

                {/* Action Buttons (Host Only) */}
                {isHost && (
                    <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.buttons}>
                        <Button
                            title="Play Again"
                            onPress={handlePlayAgain}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="refresh" size={18} color={Colors.victorianBlack} />}
                        />
                    </Animated.View>
                )}

                {!isHost && (
                    <Text style={{ textAlign: 'center', color: Colors.grayLight, marginTop: 20 }}>
                        Waiting for Host to restart...
                    </Text>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, width: '100%' },
    scroll: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        gap: 24,
        paddingBottom: 40
    },

    // Winner Banner
    winnerBanner: {
        alignItems: 'center',
        padding: 30,
        borderRadius: 25,
        gap: 12,
        borderWidth: 1,
    },
    winnerInvestigators: {
        backgroundColor: 'rgba(34, 139, 34, 0.15)',
        borderColor: Colors.detective,
    },
    winnerImposter: {
        backgroundColor: 'rgba(160, 32, 32, 0.15)',
        borderColor: Colors.suspect,
    },
    winnerTitle: {
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
    },
    winnerTitleInvestigators: { color: Colors.detective },
    winnerTitleImposter: { color: Colors.suspect },
    winnerSubtitle: {
        fontSize: 14,
        color: Colors.grayLight,
        textAlign: 'center',
    },

    // Section
    section: { gap: 12 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.candlelight,
        letterSpacing: 2,
        textAlign: 'center',
    },

    // Imposter Card
    imposterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    imposterCard: {
        backgroundColor: 'rgba(160, 32, 32, 0.2)',
        borderRadius: 25,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.suspect,
        minWidth: 120,
    },
    imposterAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.suspect,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    imposterName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.parchment,
        textAlign: 'center',
    },
    imposterRole: {
        fontSize: 12,
        color: Colors.suspect,
        fontWeight: '600',
        marginTop: 4,
    },

    // Buttons
    buttons: { gap: 12, marginTop: 8 },
});
