
import { Button, ScoreBoard, WinnerCelebration } from '@/components/game';
import { WavelengthView } from '@/components/game/WavelengthView';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function OnlineResultsView() {
    const { showAlert, AlertComponent } = useCustomAlert();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(false);
    const {
        players,
        gameMode,
        gameWinner,
        impostersCaught,
        directorWinnerId,
        roomCode,
        isHost,
        myPlayerId,
        leaveGame,
        resetRoom
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

    const handlePlayAgain = async () => {
        if (loading || !isHost || !roomCode) return;

        setLoading(true);
        haptics.medium();
        try {
            await resetRoom();
        } catch (error) {
            console.error('Failed to reset room:', error);
            alert('Failed to restart game. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Check for Match Winner (First to 10) - Skip for Pictionary (points are higher)
    const matchWinner = gameMode === 'pictionary' ? null : players.find(p => (p.score || 0) >= 10);

    if (matchWinner) {
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <WinnerCelebration
                    winner={matchWinner}
                    allPlayers={players}
                    onNewGame={isHost ? handlePlayAgain : (() => { })}
                    onHome={async () => {
                        await leaveGame();
                        router.replace('/');
                    }}
                />
            </View>
        );
    }

    const { special: specialRoleName, icon: specialRoleIcon } = getRoleNames();

    useEffect(() => {
        haptics.success();
    }, []);

    const getWinnerText = () => {
        if (gameMode === 'pictionary') {
            // Find player with max score
            const winner = [...players].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
            return { title: 'Game Over!', subtitle: `${winner?.name} is the Master Artist!` };
        }

        if (gameMode === 'directors-cut') {
            // Find the director's vote which stores the winner ID
            const director = players.find(p => p.role === 'director');
            const winnerId = director?.vote;

            if (winnerId) {
                const winnerName = players.find(p => p.id === winnerId)?.name || 'A Viewer';
                return { title: 'Viewers Win!', subtitle: `${winnerName} Guessed The Movie!` };
            }
            return { title: 'Director Wins!', subtitle: 'No One Guessed The Movie!' };
        }

        if (gameMode === 'wavelength') {
            const psychic = players.find(p => p.role === 'psychic');
            let target = 50;
            try {
                target = JSON.parse(psychic?.secretWord || '{}').target;
            } catch (e) { }

            const bestDistance = players.filter(p => p.role === 'guesser' && p.vote).reduce((min, p) => {
                const d = Math.abs(parseInt(p.vote!) - target);
                return d < min ? d : min;
            }, 100);

            if (bestDistance <= 4) return { title: 'BULLSEYE!', subtitle: 'Perfect alignment achieved!' };
            if (bestDistance <= 12) return { title: 'Close Call!', subtitle: 'You were right on the edge!' };
            if (bestDistance <= 22) return { title: 'Nice Try!', subtitle: 'Partial points awarded.' };
            return { title: 'Round Complete', subtitle: 'Too far this time!' };
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
    if (gameMode === 'directors-cut') {
        const director = players.find(p => p.role === 'director');
        displaySuccess = !!director?.vote;
    } else if (gameMode === 'wavelength') {
        displaySuccess = true;
    } else if (gameMode === 'pictionary') {
        displaySuccess = true;
    } else if (gameWinner === 'crewmates') {
        displaySuccess = true;
    }

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
                    {gameMode === 'directors-cut' && (
                        <View style={styles.secretContainer}>
                            <Text style={styles.secretLabel}>The Secret Movie was:</Text>
                            <Text style={styles.secretTitle}>
                                {(() => {
                                    const director = players.find(p => p.role === 'director');
                                    try {
                                        return JSON.parse(director?.secretWord || '{}').title || 'Unknown';
                                    } catch (e) {
                                        return director?.secretWord || 'Unknown';
                                    }
                                })()}
                            </Text>
                        </View>
                    )}
                </Animated.View>

                {/* Wavelength Reveal Section */}
                {gameMode === 'wavelength' && (
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                        <WavelengthView
                            players={players}
                            myPlayerId={myPlayerId!}
                            roomCode={roomCode!}
                            gamePhase="results"
                            isHost={isHost}
                        />
                    </Animated.View>
                )}

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
                {gameMode === 'directors-cut' && players.find(p => p.role === 'director')?.vote && (
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>Star Viewer</Text>
                        <View style={styles.imposterGrid}>
                            {players.filter(p => p.id === players.find(d => d.role === 'director')?.vote).map((player) => (
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

                {/* Action Buttons */}
                {/* Action Buttons */}
                {isHost ? (
                    <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.buttons}>
                        <Button
                            title={loading ? "Restarting..." : "Play Again"}
                            onPress={handlePlayAgain}
                            variant="primary"
                            disabled={loading}
                            size="large"
                            icon={<Ionicons name="refresh" size={18} color={Colors.victorianBlack} />}
                        />
                        <Button
                            title="Leave Room"
                            onPress={() => {
                                showAlert(
                                    "Leave Room?",
                                    "Are you sure you want to leave the room?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Leave",
                                            style: "destructive",
                                            onPress: async () => {
                                                await leaveGame();
                                                router.replace('/');
                                            }
                                        }
                                    ]
                                );
                            }}
                            variant="outline"
                            size="large"
                            icon={<Ionicons name="exit-outline" size={18} color={Colors.parchment} />}
                        />
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.buttons}>
                        <Text style={{ textAlign: 'center', color: Colors.grayLight, marginBottom: 10 }}>
                            Waiting for Host to restart...
                        </Text>
                        <Button
                            title="Leave Room"
                            onPress={() => {
                                showAlert(
                                    "Leave Room?",
                                    "Are you sure you want to leave the room?",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Leave",
                                            style: "destructive",
                                            onPress: async () => {
                                                await leaveGame();
                                                router.replace('/');
                                            }
                                        }
                                    ]
                                );
                            }}
                            variant="outline"
                            size="large"
                            icon={<Ionicons name="exit-outline" size={18} color={Colors.parchment} />}
                        />
                    </Animated.View>
                )}

            </ScrollView>
            <AlertComponent />
        </View >
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
    secretContainer: {
        marginTop: 20,
        padding: 15,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        width: '100%',
    },
    secretLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.candlelight,
        letterSpacing: 1,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    secretTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: Colors.parchment,
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
