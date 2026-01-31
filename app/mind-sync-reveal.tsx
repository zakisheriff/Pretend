import { Button, CircularTimer, NeumorphicCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MindSyncRevealScreen() {
    const router = useRouter();
    useKeepAwake();
    const insets = useSafeAreaInsets();
    const gameData = useGameStore((s) => s.gameData);
    const players = useGameStore((s) => s.players);
    const settings = useGameStore((s) => s.settings);
    const startDiscussion = useGameStore((s) => s.startDiscussion);
    const startVoting = useGameStore((s) => s.startVoting);

    const [isRevealed, setIsRevealed] = useState(false);
    const [timerMode, setTimerMode] = useState<'idle' | 'running' | 'paused' | 'done'>('idle');
    const [timeLeft, setTimeLeft] = useState(settings.discussionTime);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Block back navigation
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

    // Auto-reveal immediately for discussion phase
    useEffect(() => {
        setIsRevealed(true);
    }, []);

    if (!gameData || gameData.type !== 'mind-sync') {
        return null;
    }

    const { mainQuestion, category } = gameData.data;


    // Timer Logic
    useEffect(() => {
        if (timerMode === 'running' && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((t) => {
                    if (t <= 1) {
                        setTimerMode('done');
                        haptics.success();
                        return 0;
                    }
                    if (t === 11 || t === 6) haptics.warning();
                    else if (t <= 5) haptics.light();
                    return t - 1;
                });
            }, 1000);
        } else {
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [timerMode, timeLeft]);


    const handleStartTimer = () => {
        haptics.heavy();
        startDiscussion(); // Set phase in store (optional but good for consistency)
        setTimerMode('running');
    };

    const handlePause = () => {
        haptics.medium();
        setTimerMode(prev => prev === 'running' ? 'paused' : 'running');
    };

    const handleSkip = () => {
        haptics.medium();
        setTimerMode('done');
        setTimeLeft(0);
    };

    const handleGoToVoting = () => {
        haptics.heavy();
        startVoting();
        router.push('/vote-mode');
    };

    return (
        <View style={styles.container}>
            <View style={[styles.fixedHeader, { paddingTop: insets.top + 10 }]}>
                <View style={styles.header}>
                    <View style={styles.iconCircle}>
                        <Ionicons name={isRevealed ? "git-compare" : "chatbubbles-outline"} size={32} color={Colors.candlelight} />
                    </View>
                    <Text style={styles.title}>{isRevealed ? "The Reveal" : "The Argument"}</Text>
                    <Text style={styles.subtitle}>Category: {category}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120, paddingTop: insets.top + 160 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.cardsArea}>
                    {!isRevealed ? (
                        <Animated.View entering={FadeInUp.duration(600)} style={styles.argumentPhase}>
                            <View style={styles.instructionCard}>
                                <Ionicons name="megaphone-outline" size={40} color={Colors.candlelight} style={{ marginBottom: 15 }} />
                                <Text style={styles.argumentTitle}>Time to Argue!</Text>
                                <Text style={styles.argumentText}>
                                    Discuss your answers based on your secret questions.
                                    Can you spot the Outlier based on their answer alone?
                                </Text>
                            </View>
                        </Animated.View>
                    ) : (
                        <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.cardWrapper}>

                            {/* Timer Section - Only visible when timer is active/done */}
                            {timerMode !== 'idle' && (
                                <Animated.View entering={FadeInDown} style={styles.timerSection}>
                                    <CircularTimer
                                        duration={settings.discussionTime}
                                        timeRemaining={timeLeft}
                                        size={180}
                                        strokeWidth={8}
                                    />
                                    {timerMode === 'paused' && (
                                        <View style={styles.pausedBadge}>
                                            <Text style={styles.pausedText}>PAUSED</Text>
                                        </View>
                                    )}
                                </Animated.View>
                            )}

                            <Text style={styles.cardLabel}>THE QUESTION WAS:</Text>
                            <NeumorphicCard style={styles.mainCard}>
                                <Text style={styles.questionText}>{mainQuestion}</Text>
                            </NeumorphicCard>

                            <Text style={[styles.cardLabel, { marginTop: 30, marginBottom: 10 }]}>PLAYER ANSWERS:</Text>
                            <View style={styles.answersGrid}>
                                {players.map((p, index) => (
                                    <Animated.View
                                        key={p.id}
                                        entering={FadeInDown.delay(400 + (index * 100))}
                                        style={styles.answerCard}
                                    >
                                        <Text style={styles.answerPlayer}>{p.name}</Text>
                                        <Text style={styles.answerText}>"{p.answer || '...'}"</Text>
                                    </Animated.View>
                                ))}
                            </View>

                            <Text style={styles.outlierHint}>
                                If your question was different, you are the OUTLIER.
                            </Text>
                        </Animated.View>
                    )}
                </View>
            </ScrollView>

            <Animated.View
                entering={FadeInDown.delay(isRevealed ? 400 : 800).duration(600)}
                style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}
            >
                {!isRevealed ? (
                    <Button
                        title="Reveal Question"
                        onPress={() => setIsRevealed(true)}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="eye-outline" size={18} color={Colors.victorianBlack} />}
                    />
                ) : timerMode === 'idle' ? (
                    <Button
                        title="Start Timer"
                        onPress={handleStartTimer}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="timer-outline" size={18} color={Colors.victorianBlack} />}
                    />
                ) : timerMode === 'done' ? (
                    <Button
                        title="Start Voting"
                        onPress={handleGoToVoting}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="finger-print" size={18} color={Colors.victorianBlack} />}
                    />
                ) : (
                    <View style={styles.controlsRow}>
                        <Button
                            title={timerMode === 'running' ? "Pause" : "Resume"}
                            onPress={handlePause}
                            variant="outline"
                            size="large"
                            style={{ flex: 1 }}
                            icon={<Ionicons name={timerMode === 'running' ? "pause" : "play"} size={18} color={Colors.candlelight} />}
                        />
                        <Button
                            title="Skip"
                            onPress={handleSkip}
                            variant="secondary"
                            size="large"
                            style={{ flex: 1 }}
                            icon={<Ionicons name="play-forward" size={18} color={Colors.parchment} />}
                        />
                    </View>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
    },
    fixedHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
        backgroundColor: Colors.victorianBlack,
    },
    header: {
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
        width: '100%',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 10,
    },
    // iconCircle and title styles remain same
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(196,167,108,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(196,167,108,0.3)',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.parchment,
        letterSpacing: 3,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: Colors.candlelight,
        marginTop: 6,
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.8,
        marginBottom: 10,
    },
    cardsArea: {
        // Removed flex: 1 and justifyContent
        gap: 25,
        marginVertical: 10,
    },
    argumentPhase: {
        alignItems: 'center',
        gap: 30,
        width: '100%',
    },
    instructionCard: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        width: '100%',
    },
    argumentTitle: {
        color: Colors.parchment,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 15,
        textAlign: 'center',
    },
    argumentText: {
        color: Colors.grayLight,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    cardWrapper: {
        gap: 12,
        width: '100%',
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.grayLight,
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingLeft: 10,
    },
    mainCard: {
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(196,167,108,0.2)',
    },
    outlierHint: {
        fontSize: 14,
        color: Colors.grayLight,
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    questionText: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.parchment,
        textAlign: 'center',
        lineHeight: 30,
        fontStyle: 'italic',
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.victorianBlack,
        paddingHorizontal: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        gap: 15,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(196,167,108,0.1)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(196,167,108,0.2)',
    },
    alertText: {
        flex: 1,
        fontSize: 13,
        color: Colors.parchment,
        lineHeight: 18,
    },
    answersGrid: {
        gap: 10,
        width: '100%',
    },
    answerCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: Colors.candlelight,
    },
    answerPlayer: {
        fontSize: 11,
        color: Colors.grayLight,
        marginBottom: 4,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    answerText: {
        fontSize: 16,
        color: Colors.parchment,
        fontStyle: 'italic',
        lineHeight: 22,
    },
    timerSection: {
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 10,
    },
    pausedBadge: {
        position: 'absolute',
        top: '40%',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.gaslightAmber,
    },
    pausedText: {
        color: Colors.gaslightAmber,
        fontWeight: '800',
        letterSpacing: 2,
        fontSize: 12,
    },
    controlsRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },

});
