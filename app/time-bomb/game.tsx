import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { TimeBombData } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TimeBombGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gameData = useGameStore((s) => s.gameData);
    const refreshTimeBombData = useGameStore((s) => s.refreshTimeBombData);
    const { category, letter, duration, hiddenTimer } = (gameData?.data as TimeBombData) || { category: '?', letter: '?', duration: 60, hiddenTimer: false };

    const [timeLeft, setTimeLeft] = useState(duration);
    const [isActive, setIsActive] = useState(true);
    const [isExploded, setIsExploded] = useState(false);
    const [hasStarted, setHasStarted] = useState(false);

    const pulseAnim = useSharedValue(1);
    const timerRef = useRef<any>(null);

    useEffect(() => {
        if (hasStarted) {
            startTimer();
        }

        // Pulse animation for the bomb icon
        pulseAnim.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
            ),
            -1,
            true
        );

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [hasStarted]);

    const startTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    handleExplosion();
                    return 0;
                }
                // Haptic feedback on last 10 seconds
                if (prev <= 11) haptics.selection();
                return prev - 1;
            });
        }, 1000);
    };

    const handleExplosion = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsActive(false);
        setIsExploded(true);
        haptics.error(); // Long vibration
    };

    const handleManualExplode = () => {
        haptics.heavy();
        handleExplosion();
    };

    const handleStart = () => {
        haptics.heavy();
        setHasStarted(true);
    };

    const handleReroll = () => {
        haptics.medium();
        refreshTimeBombData();
    };

    const handleProceed = () => {
        haptics.medium();
        router.push('/time-bomb/voting');
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const animatedIconStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseAnim.value }]
    }));

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
            >
                <BackButton />
            </LinearGradient>

            <View style={styles.content}>

                {/* Prompt Section */}
                <View style={styles.promptCard}>
                    <Text style={styles.promptLabel}>Pass the phone and name a...</Text>
                    <Text style={styles.categoryText}>{category}</Text>
                    <Text style={styles.midLabel}>starting with</Text>
                    <View style={styles.letterBox}>
                        <Text style={styles.letterText}>{letter}</Text>
                    </View>

                    {!hasStarted && (
                        <Button
                            title="Reroll Prompt"
                            onPress={handleReroll}
                            variant="outline"
                            icon={<Ionicons name="refresh" size={18} color={Colors.candlelight} />}
                            style={{ marginTop: 20, borderColor: Colors.grayLight }}
                            textStyle={{ color: Colors.grayLight, fontSize: 14 }}
                        />
                    )}

                    {!hasStarted && (
                        <Text style={styles.durationHint}>
                            {hiddenTimer ? "Timer: Mystery " : `Timer: ${JSON.stringify(duration)}s`}
                        </Text>
                    )}
                </View>

                {/* Timer Section - Only show after start */}
                {hasStarted && (
                    <View style={styles.timerContainer}>
                        <Animated.View style={[styles.bombIconContainer, !isExploded && animatedIconStyle]}>
                            <Ionicons
                                name={isExploded ? "skull" : "timer"}
                                size={100}
                                color={isExploded ? Colors.suspect : Colors.candlelight}
                            />
                        </Animated.View>

                        <Text style={[styles.timerText, isExploded && styles.timerTextExploded]}>
                            {isExploded ? "BOOM!" : (hiddenTimer ? "???" : formatTime(timeLeft))}
                        </Text>

                        {isExploded && (
                            <Text style={styles.explodedText}>Time's Up!</Text>
                        )}
                    </View>
                )}

                {/* Controls */}
                <View style={styles.footer}>
                    {!hasStarted ? (
                        <Button
                            title="Start Timer"
                            onPress={handleStart}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="play" size={24} color={Colors.victorianBlack} />}
                        />
                    ) : !isExploded ? (
                        <Button
                            title="Explode Now"
                            onPress={handleManualExplode}
                            variant="primary"
                            size="large"
                            style={{ backgroundColor: Colors.suspect, borderColor: Colors.suspect }}
                            icon={<Ionicons name="flame" size={24} color={Colors.parchment} />}
                        />
                    ) : (
                        <Button
                            title="Select Loser"
                            onPress={handleProceed}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="skull-outline" size={24} color={Colors.victorianBlack} />}
                        />
                    )}
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        padding: 24,
        paddingTop: 100,
    },

    promptCard: {
        alignItems: 'center',
        gap: 8,
    },
    promptLabel: {
        fontSize: 16,
        color: Colors.grayLight,
        fontWeight: '600',
    },
    categoryText: {
        fontSize: 36,
        fontWeight: '900',
        color: Colors.parchment,
        textAlign: 'center',
        letterSpacing: 1,
    },
    midLabel: {
        fontSize: 14,
        color: Colors.grayLight,
        fontStyle: 'italic',
        marginTop: 4,
    },
    letterBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.grayDark,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: Colors.candlelight,
        marginTop: 10,
    },
    letterText: {
        fontSize: 48,
        fontWeight: '900',
        color: Colors.candlelight,
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
    },

    timerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    bombIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerText: {
        fontSize: 64,
        fontWeight: '900',
        color: Colors.parchment,
        fontVariant: ['tabular-nums'],
    },
    timerTextExploded: {
        color: Colors.suspect,
    },
    explodedText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.suspect,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },

    footer: {
        paddingBottom: 20,
    },
    durationHint: {
        fontSize: 16,
        color: Colors.parchment,
        fontWeight: '600',
        marginTop: 15,
        letterSpacing: 0.5,
    },
});
