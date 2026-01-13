import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    FadeOut,
    FadeOutUp,
    ZoomIn as ScaleInCenter,
    useAnimatedStyle,
    withDelay,
    withRepeat,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const Firework = ({ delay }: { delay: number }) => {
    const x = Math.random() * width;
    const y = 100 + Math.random() * (height / 2);
    const particles = Array.from({ length: 12 });

    return (
        <View style={[styles.fireworkContainer, { left: x, top: y }]}>
            {particles.map((_, i) => {
                const angle = (i / 12) * 2 * Math.PI;
                const distance = 60 + Math.random() * 40;
                const particleX = Math.cos(angle) * distance;
                const particleY = Math.sin(angle) * distance;

                return (
                    <Animated.View
                        key={i}
                        entering={ScaleInCenter.delay(delay).duration(400)}
                        style={[
                            styles.particle,
                            useAnimatedStyle(() => ({
                                transform: [
                                    { translateX: withDelay(delay, withSpring(particleX)) },
                                    { translateY: withDelay(delay, withSpring(particleY)) },
                                ],
                                opacity: withDelay(delay + 500, withTiming(0)),
                            }))
                        ]}
                    />
                );
            })}
        </View>
    );
};

const ConfettiPiece = ({ index }: { index: number }) => {
    const { width, height } = useWindowDimensions();
    const x = Math.random() * width;
    const startY = -50;
    const duration = 2500 + Math.random() * 3000;
    const delay = Math.random() * 2000;
    const colors = [Colors.pureGold, Colors.crownGold, '#FFDF00', '#F97316', '#EAB308'];

    return (
        <Animated.View
            entering={FadeIn.delay(delay)}
            style={[
                styles.confetti,
                {
                    left: x,
                    top: startY,
                    backgroundColor: colors[index % colors.length],
                    width: 6 + Math.random() * 6,
                    height: 6 + Math.random() * 6,
                },
                useAnimatedStyle(() => ({
                    transform: [
                        { translateY: withRepeat(withTiming(height + 200, { duration }), -1, false) },
                        { rotate: withRepeat(withTiming('360deg', { duration: 1000 }), -1, false) },
                    ],
                }))
            ]}
        />
    );
};

interface WinnerCelebrationProps {
    winner: Player;
    allPlayers: Player[];
    onNewGame: () => void;
    onHome: () => void;
}

export const WinnerCelebration = ({ winner, allPlayers, onNewGame, onHome }: WinnerCelebrationProps) => {
    const insets = useSafeAreaInsets();
    const sortedPlayers = [...allPlayers].sort((a, b) => b.score - a.score);
    const [showPodium, setShowPodium] = useState(false);
    const [showFullLeaderboard, setShowFullLeaderboard] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setShowPodium(true), 2500);
        return () => clearTimeout(timer);
    }, []);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Background Decorations */}
            {Array.from({ length: 15 }).map((_, i) => (
                <Firework key={`fw-${i}`} delay={i * 400} />
            ))}
            {Array.from({ length: 40 }).map((_, i) => (
                <ConfettiPiece key={`c-${i}`} index={i} />
            ))}

            <View style={styles.content}>
                {!showPodium ? (
                    <Animated.View
                        entering={FadeIn.duration(800)}
                        exiting={FadeOut.duration(600)}
                        style={styles.revealSection}
                    >
                        <Animated.View entering={ScaleInCenter.springify()}>
                            <Ionicons name="trophy" size={120} color={Colors.pureGold} />
                        </Animated.View>
                        <Animated.Text
                            entering={FadeInDown.delay(300).springify()}
                            style={styles.championTitle}
                        >
                            GRAND CHAMPION
                        </Animated.Text>
                        <Animated.Text
                            entering={FadeInUp.delay(600).springify()}
                            style={styles.championName}
                        >
                            {winner.name}
                        </Animated.Text>
                    </Animated.View>
                ) : (
                    <Animated.ScrollView
                        entering={FadeInUp.duration(800)}
                        style={styles.podiumSection}
                        contentContainerStyle={styles.podiumContent}
                    >
                        <Text style={styles.finalLeaderboardTitle}>Tournament Results</Text>

                        <View style={styles.podium}>
                            {/* 2nd Place */}
                            {sortedPlayers[1] && (
                                <View style={styles.podiumPlace}>
                                    <Text style={styles.placeText}>2nd</Text>
                                    <View style={[styles.podiumBar, styles.bar2]}>
                                        <Text style={styles.podiumName}>{sortedPlayers[1].name}</Text>
                                        <Text style={styles.podiumScore}>{sortedPlayers[1].score}</Text>
                                    </View>
                                </View>
                            )}

                            {/* 1st Place */}
                            <View style={styles.podiumPlace}>
                                <Ionicons name="ribbon" size={24} color={Colors.pureGold} style={{ marginBottom: 4 }} />
                                <Text style={[styles.placeText, { color: Colors.pureGold }]}>1st</Text>
                                <View style={[styles.podiumBar, styles.bar1]}>
                                    <Text style={[styles.podiumName, { fontWeight: '900' }]}>{winner.name}</Text>
                                    <Text style={[styles.podiumScore, { color: Colors.pureGold }]}>{winner.score}</Text>
                                </View>
                            </View>

                            {/* 3rd Place */}
                            {sortedPlayers[2] && (
                                <View style={styles.podiumPlace}>
                                    <Text style={styles.placeText}>3rd</Text>
                                    <View style={[styles.podiumBar, styles.bar3]}>
                                        <Text style={styles.podiumName}>{sortedPlayers[2].name}</Text>
                                        <Text style={styles.podiumScore}>{sortedPlayers[2].score}</Text>
                                    </View>
                                </View>
                            )}
                        </View>

                        {/* Rest of the players - Toggle */}
                        {/* Full Leaderboard Toggle */}
                        <View style={styles.othersSection}>
                            {!showFullLeaderboard ? (
                                <Animated.View entering={FadeIn.delay(300).duration(400)} exiting={FadeOut}>
                                    <TouchableOpacity
                                        style={styles.viewAllBtn}
                                        onPress={() => setShowFullLeaderboard(true)}
                                    >
                                        <Ionicons name="list" size={16} color={Colors.candlelight} />
                                        <Text style={styles.viewAllText}>View Full Leaderboard</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            ) : (
                                <Animated.View entering={FadeInUp} exiting={FadeOutUp} style={{ width: '100%' }}>
                                    <View style={styles.othersList}>
                                        {sortedPlayers.map((p, i) => (
                                            <View key={p.id} style={styles.otherRow}>
                                                <Text style={styles.otherRank}>#{i + 1}</Text>
                                                <Text style={styles.otherName}>{p.name}</Text>
                                                <Text style={styles.otherScore}>{p.score} pts</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.viewAllBtn, { marginTop: 12, alignSelf: 'center' }]}
                                        onPress={() => setShowFullLeaderboard(false)}
                                    >
                                        <Text style={styles.viewAllText}>Hide Leaderboard</Text>
                                    </TouchableOpacity>
                                </Animated.View>
                            )}
                        </View>

                        <View style={styles.actions}>
                            <Button
                                title="Start New Tournament"
                                onPress={onNewGame}
                                variant="primary"
                                size="medium"
                                icon={<Ionicons name="refresh" size={20} color={Colors.victorianBlack} />}
                                style={{ backgroundColor: Colors.pureGold, borderColor: Colors.pureGold }}
                            />

                            <Button
                                title="Back to Home"
                                onPress={onHome}
                                variant="outline"
                                size="medium"
                                icon={<Ionicons name="home-outline" size={20} color={Colors.parchment} />}
                                textStyle={{ color: Colors.parchment }}
                                style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}
                            />
                        </View>
                    </Animated.ScrollView>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    content: {
        flex: 1,
    },
    revealSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        width: '100%',
        padding: 24,
    },
    championTitle: {
        fontSize: 14,
        fontWeight: '900',
        color: Colors.pureGold,
        letterSpacing: 6,
        textShadowColor: 'rgba(255, 215, 0, 0.5)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
    },
    championName: {
        fontSize: 48,
        fontWeight: '800',
        color: Colors.parchment,
        textAlign: 'center',
    },
    podiumSection: {
        flex: 1,
    },
    podiumContent: {
        paddingVertical: 20,
        paddingHorizontal: 24,
        gap: 30,
        flexGrow: 1,
        justifyContent: 'center',
    },
    finalLeaderboardTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.parchment,
        textAlign: 'center',
        marginBottom: 10,
    },
    podium: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        gap: 10,
        height: 300,
        marginTop: 40,
    },
    podiumPlace: {
        flex: 1,
        alignItems: 'center',
    },
    placeText: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.grayLight,
        marginBottom: 8,
    },
    podiumBar: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    bar1: {
        height: 240,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        borderColor: Colors.pureGold,
        borderWidth: 2,
    },
    bar2: {
        height: 180,
    },
    bar3: {
        height: 140,
    },
    podiumName: {
        fontSize: 14,
        color: Colors.parchment,
        textAlign: 'center',
    },
    podiumScore: {
        fontSize: 20,
        fontWeight: '900',
        color: Colors.parchment,
    },
    othersList: {
        gap: 12,
        marginTop: 20,
    },
    otherRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 20,
        gap: 15,
    },
    otherRank: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.grayLight,
        width: 25,
    },
    otherName: {
        flex: 1,
        fontSize: 16,
        color: Colors.parchment,
    },
    otherScore: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.grayLight,
    },
    viewAllText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.candlelight,
    },
    actions: {
        gap: 12,
        marginTop: 20,
        paddingBottom: 40,
    },
    // Restored styles
    fireworkContainer: {
        position: 'absolute',
        width: 0,
        height: 0,
    },
    particle: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: Colors.pureGold,
    },
    confetti: {
        position: 'absolute',
        borderRadius: 2,
    },
    othersSection: {
        marginTop: 20,
        alignItems: 'center',
    },
    viewAllBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
});
