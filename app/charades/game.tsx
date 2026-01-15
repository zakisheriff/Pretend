import { Colors } from '@/constants/colors';
import { CHARADES_WORDS } from '@/data/charades';
import { useGameStore } from '@/store/gameStore';
import { CharadesData } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CharadesGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gameData = useGameStore((s) => s.gameData);
    const players = useGameStore((s) => s.players);
    const currentPlayer = useGameStore((s) => {
        if (s.gameData?.type === 'charades') {
            return s.players.find(p => p.id === (s.gameData!.data as CharadesData).selectedPlayerId);
        }
        return undefined;
    });

    // Safety check for data with HARD fallback
    const charadesData = gameData?.data as CharadesData | undefined;

    // Use persistent fallback words from the real data source (shuffled once)
    const [fallbackWords] = useState(() =>
        [...CHARADES_WORDS].sort(() => Math.random() - 0.5).slice(0, 20)
    );

    const words = (charadesData?.words && charadesData.words.length > 0) ? charadesData.words : fallbackWords;
    const duration = charadesData?.duration || 60;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0);
    const [timeLeft, setTimeLeft] = useState(duration);

    // Phases: 'setup' -> 'ready' -> 'playing'
    const [phase, setPhase] = useState<'setup' | 'ready' | 'playing'>('setup');

    // Feedback state
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'pass'>('none');

    // Refs for sensor logic
    const lastTriggerTime = useRef(0);
    const isGameActiveRef = useRef(false);
    const isNeutralRef = useRef(false); // Must return to vertical to re-arm
    const TRIGGER_DELAY = 1000;

    // Cleanup ref to avoid state updates after unmount
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        // Lock to landscape for Charades (Skip on Web)
        const lockLandscape = async () => {
            if (Platform.OS === 'web') return;
            try {
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
            } catch (error) {
                console.warn("Failed to lock landscape", error);
            }
        };
        lockLandscape();

        // Reset state
        isGameActiveRef.current = false;
        isNeutralRef.current = false;

        return () => {
            isMounted.current = false;
            // Unlock orientation on cleanup
            if (Platform.OS !== 'web') {
                ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => { });
            }
        };
    }, []);

    const [showConfirm, setShowConfirm] = useState(false);

    const finishGame = React.useCallback(() => {
        // Prevent multiple calls
        if (!isGameActiveRef.current && phase !== 'playing') return;

        // Stop Logic
        isGameActiveRef.current = false;

        // Unlock orientation BEFORE navigating
        ScreenOrientation.unlockAsync().catch(() => { });

        haptics.success();

        // Calculate Points
        // 5+ words = 1 point
        // 10+ words = 2 points
        // 20 words (max) = 3 points
        let points = 0;
        if (correctCount >= 20) points = 3;
        else if (correctCount >= 10) points = 2;
        else if (correctCount >= 5) points = 1;

        let winnerId: string | null = null;
        const WINNING_SCORE = 10;

        if (currentPlayer && points > 0) {
            const updatedPlayers = players.map(p =>
                p.id === currentPlayer.id ? { ...p, score: p.score + points } : p
            );
            useGameStore.getState().reorderPlayers(updatedPlayers);

            // Check for 10-point winner
            const winner = updatedPlayers.find(p => p.score >= WINNING_SCORE);
            if (winner) {
                winnerId = winner.id;
            }
        }

        // Navigate to dedicated results screen (Forces Portrait)
        router.replace({
            pathname: '/charades/results',
            params: {
                score: correctCount.toString(),
                duration: duration.toString(),
                playerId: currentPlayer?.id,
                pointsEarned: points.toString(),
                winnerId: winnerId || ''
            }
        });
    }, [correctCount, duration, currentPlayer, players, phase, router]);

    // Timer Logic
    useEffect(() => {
        let interval: any;
        let startTimeout: any;

        if (phase === 'playing') {
            // 3-Second buffer before sensors activate
            startTimeout = setTimeout(() => {
                if (isMounted.current) {
                    isGameActiveRef.current = true;
                }
            }, 3000);

            interval = setInterval(() => {
                setTimeLeft((prev) => {
                    const newValue = prev - 1;
                    return newValue < 0 ? 0 : newValue;
                });
            }, 1000);
        }

        return () => {
            clearInterval(interval);
            clearTimeout(startTimeout);
        };
    }, [phase]);

    // Check for game end due to time
    useEffect(() => {
        if (phase === 'playing' && timeLeft === 0) {
            finishGame();
        }
    }, [timeLeft, phase, finishGame]);

    const nextWord = () => {
        if (currentIndex < words.length - 1) {
            setCurrentIndex(prev => prev + 1);
        } else {
            finishGame();
        }
    };

    const handleCorrect = () => {
        const now = Date.now();
        if (now - lastTriggerTime.current < TRIGGER_DELAY) return;
        lastTriggerTime.current = now;

        haptics.success();
        setFeedback('correct');
        setCorrectCount(c => c + 1);

        setTimeout(() => {
            if (isMounted.current) {
                setFeedback('none');
                nextWord();
            }
        }, 800);
    };

    const handlePass = () => {
        const now = Date.now();
        if (now - lastTriggerTime.current < TRIGGER_DELAY) return;
        lastTriggerTime.current = now;

        haptics.error();
        setFeedback('pass');

        setTimeout(() => {
            if (isMounted.current) {
                setFeedback('none');
                nextWord();
            }
        }, 800);
    };

    // DeviceMotion sensor for tilt detection
    useEffect(() => {
        if (phase !== 'playing') return;
        if (Platform.OS === 'web') return; // Disable sensors on web

        const subscription = DeviceMotion.addListener((data) => {
            if (!isGameActiveRef.current) return;
            const gravityZ = data.accelerationIncludingGravity?.z;
            if (gravityZ === undefined) return;

            // NEUTRAL ZONE (Vertical / Forehead): Z between -4 and 4
            if (gravityZ > -4 && gravityZ < 4) {
                isNeutralRef.current = true;
                return;
            }

            // If not neutral yet, ignore tilts
            if (!isNeutralRef.current) return;

            // CORRECT (Tilt Down/Floor): Z > 8.5
            if (gravityZ > 8.5) {
                handleCorrect();
                isNeutralRef.current = false;
            }
            // PASS (Tilt Up/Ceiling): Z < -8.5
            else if (gravityZ < -8.5) {
                handlePass();
                isNeutralRef.current = false;
            }
        });

        DeviceMotion.setUpdateInterval(100);
        return () => subscription.remove();
    }, [phase, currentIndex]);

    const handleReady = () => {
        // Show custom confirmation overlay instead of Alert
        haptics.selection();
        setShowConfirm(true);
    };

    const confirmStart = () => {
        setShowConfirm(false);
        setPhase('playing');
        haptics.medium();
    };

    const cancelStart = () => {
        setShowConfirm(false);
    };

    const renderSetup = () => (
        <View style={styles.centerContent}>
            <Text style={styles.title}>New Round</Text>
            <Text style={styles.playerText}>{currentPlayer?.name}</Text>
            <Text style={styles.subText}>You are up!</Text>
            <Pressable onPress={() => setPhase('ready')} style={styles.primaryButton}>
                <Text style={styles.buttonText}>I'm Ready</Text>
            </Pressable>
        </View>
    );

    const renderWebControls = () => (
        <View style={styles.webControls}>
            <Pressable onPress={handlePass} style={[styles.controlBtn, styles.passBtn]}>
                <Ionicons name="close" size={32} color={Colors.parchment} />
                <Text style={styles.controlBtnText}>PASS</Text>
            </Pressable>
            <Pressable onPress={handleCorrect} style={[styles.controlBtn, styles.correctBtn]}>
                <Ionicons name="checkmark" size={32} color={Colors.victorianBlack} />
                <Text style={[styles.controlBtnText, { color: Colors.victorianBlack }]}>CORRECT</Text>
            </Pressable>
        </View>
    );

    const renderReady = () => (
        <View style={styles.centerContent}>
            <Text style={styles.instructionText}>Place phone on forehead </Text>
            <Text style={styles.subInstruction}>Screen facing the crowd! </Text>
            <View style={{ height: 40 }} />
            <Pressable onPress={handleReady} style={styles.readyTapArea}>
                <Text style={styles.readyTapText}>TAP TO START</Text>
            </Pressable>

            {/* Custom Confirmation Overlay */}
            {showConfirm && (
                <View style={[StyleSheet.absoluteFill, styles.confirmOverlay]}>
                    <View style={styles.confirmBox}>
                        <Text style={styles.confirmTitle}>Ready to Start?</Text>
                        <Text style={styles.confirmSub}>Ensure the screen is facing the crowd!</Text>

                        <View style={styles.confirmButtons}>
                            <Pressable onPress={cancelStart} style={[styles.confirmBtn, styles.cancelBtn]}>
                                <Text style={styles.confirmBtnText}>Cancel</Text>
                            </Pressable>
                            <Pressable onPress={confirmStart} style={[styles.confirmBtn, styles.startBtn]}>
                                <Text style={[styles.confirmBtnText, { color: Colors.victorianBlack }]}>Start Game</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );

    const currentWord = words[currentIndex] || "Finished!";
    const passColor = Colors.imposter || '#FF4444';
    const feedbackColor = feedback === 'correct' ? Colors.success : feedback === 'pass' ? passColor : 'transparent';

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={feedback === 'none' ? [Colors.victorianBlack, '#1a1a1a'] : [feedbackColor, Colors.victorianBlack]}
                style={StyleSheet.absoluteFill}
            />

            {phase === 'setup' && renderSetup()}
            {phase === 'ready' && renderReady()}

            {phase === 'playing' && (
                <View style={styles.gameContent}>
                    <View style={styles.header}>
                        <Text style={styles.timer}>{timeLeft}</Text>
                        <Text style={styles.wordCounter}>{currentIndex + 1}/{words.length}</Text>
                        <Text style={styles.scoreCounter}>Correct: {correctCount}</Text>
                    </View>

                    <View style={styles.wordContainer}>
                        {feedback === 'none' ? (
                            <Animated.Text entering={ZoomIn} exiting={ZoomOut} style={styles.wordText}>
                                {currentWord}
                            </Animated.Text>
                        ) : (
                            <Animated.Text entering={ZoomIn} key={feedback} style={[styles.feedbackText, { color: Colors.white }]}>
                                {feedback === 'correct' ? 'CORRECT!' : 'PASS'}
                            </Animated.Text>
                        )}
                    </View>

                    {Platform.OS === 'web' ? renderWebControls() : (
                        <Text style={styles.hintText}>Tilt DOWN for Correct • UP to Pass</Text>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    title: {
        fontSize: 32,
        color: Colors.parchment,
        marginBottom: 20,
        fontFamily: 'SpecialElite_400Regular',
    },
    playerText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: Colors.candlelight,
        marginBottom: 10,
        textAlign: 'center',
    },
    subText: {
        fontSize: 24,
        color: Colors.grayLight,
        marginBottom: 40,
        fontFamily: 'SpecialElite_400Regular',
    },
    primaryButton: {
        backgroundColor: Colors.candlelight,
        paddingHorizontal: 40,
        paddingVertical: 15,
        borderRadius: 30,
    },
    buttonText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.victorianBlack,
    },
    instructionText: {
        fontSize: 36,
        color: Colors.parchment,
        textAlign: 'center',
        marginBottom: 10,
        fontWeight: 'bold',
    },
    subInstruction: {
        fontSize: 24,
        color: Colors.grayLight,
        textAlign: 'center',
        marginBottom: 40,
    },
    readyTapArea: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: Colors.candlelight,
    },
    readyTapText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.candlelight,
        letterSpacing: 2,
    },
    gameContent: {
        flex: 1,
        width: '100%',
        justifyContent: 'space-between',
        paddingVertical: 20,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '90%',
        marginTop: 10,
    },
    timer: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.imposter,
    },
    scoreCounter: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.success,
    },
    wordCounter: {
        fontSize: 24,
        fontWeight: '600',
        color: Colors.grayLight,
    },
    wordContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    wordText: {
        fontSize: 80, // HUGE TEXT for charades
        fontWeight: 'bold',
        color: Colors.parchment,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 5,
    },
    feedbackText: {
        fontSize: 60,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    hintText: {
        fontSize: 18,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 10,
    },
    gameOverTitle: {
        fontSize: 48,
        color: Colors.imposter,
        marginBottom: 20,
        fontWeight: 'bold',
    },
    finalCount: {
        fontSize: 80,
        color: Colors.success,
        fontWeight: 'bold',
    },
    scoreLabel: {
        fontSize: 24,
        color: Colors.grayLight,
        marginTop: 10,
    },
    pointsEarned: {
        fontSize: 24,
        color: Colors.candlelight,
        marginTop: 20,
        fontWeight: 'bold',
    },
    confirmOverlay: {
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    confirmBox: {
        backgroundColor: Colors.grayDark || '#0A0A0A',
        padding: 30,
        borderRadius: 20,
        width: '90%', // Increased from 60% for mobile
        maxWidth: 500, // Cap on desktop
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.candlelight,
        shadowColor: Colors.candlelight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    confirmTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.parchment,
        marginBottom: 10,
        textAlign: 'center',
    },
    confirmSub: {
        fontSize: 20,
        color: Colors.grayLight,
        marginBottom: 30,
        textAlign: 'center',
    },
    confirmButtons: {
        flexDirection: 'row',
        gap: 15,
        width: '100%',
        justifyContent: 'center',
    },
    confirmBtn: {
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderRadius: 15,
        flex: 1, // Allow shrinking
        minWidth: 100,
        alignItems: 'center',
    },
    cancelBtn: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.grayLight,
    },
    startBtn: {
        backgroundColor: Colors.candlelight,
    },
    confirmBtnText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.parchment,
    },
    webControls: {
        flexDirection: 'row',
        gap: 20, // Reduced from 40
        marginBottom: 30,
        width: '100%',
        justifyContent: 'center',
        paddingHorizontal: 20, // Prevent edge touching
    },
    controlBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8, // Reduced gap
        paddingVertical: 18,
        paddingHorizontal: 20, // Reduced padding
        borderRadius: 16,
        borderWidth: 2,
        flex: 1, // Allow shrinking/growing
        maxWidth: 200, // Cap width
        justifyContent: 'center',
    },
    passBtn: {
        backgroundColor: 'rgba(255, 68, 68, 0.1)', // Slight red tint
        borderColor: Colors.imposter,
    },
    correctBtn: {
        backgroundColor: Colors.candlelight,
        borderColor: Colors.candlelight,
    },
    controlBtnText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.parchment,
        letterSpacing: 1,
    }
});
