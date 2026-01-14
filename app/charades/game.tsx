import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { CharadesData } from '@/types/game';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
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

    // Fallback list if store data fails
    const FALLBACK_WORDS = ['Spiderman', 'Batman', 'Pizza', 'Zombie', 'Elvis', 'Robot', 'Monkey', 'Doctor', 'Teacher', 'Ninja'];

    const words = (charadesData?.words && charadesData.words.length > 0) ? charadesData.words : FALLBACK_WORDS;
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

        // Lock to landscape for Charades
        const lockLandscape = async () => {
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
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT).catch(() => { });
        };
    }, []);

    const finishGame = React.useCallback(() => {
        // Prevent multiple calls
        if (!isGameActiveRef.current && phase !== 'playing') return;

        // Stop Logic
        isGameActiveRef.current = false;

        // Unlock orientation BEFORE navigating
        ScreenOrientation.unlockAsync().catch(() => { });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Calculate Points
        let points = 0;
        if (duration === 30 && correctCount > 5) points = 1;
        if (duration === 60 && correctCount > 10) points = 2;

        if (currentPlayer && points > 0) {
            const updatedPlayers = players.map(p =>
                p.id === currentPlayer.id ? { ...p, score: p.score + points } : p
            );
            useGameStore.getState().reorderPlayers(updatedPlayers);
        }

        // Navigate to dedicated results screen (Forces Portrait)
        router.replace({
            pathname: '/charades/results',
            params: {
                score: correctCount.toString(),
                duration: duration.toString(),
                playerId: currentPlayer?.id,
                pointsEarned: points.toString()
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

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFeedback('correct');
        setCorrectCount(c => c + 1);

        // Show feedback then next word
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

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setFeedback('pass');

        // Show feedback then next word
        setTimeout(() => {
            if (isMounted.current) {
                setFeedback('none');
                nextWord();
            }
        }, 800);
    };

    useEffect(() => {
        if (phase !== 'playing') return;

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
                isNeutralRef.current = false; // Disarm until neutral again
            }
            // PASS (Tilt Up/Ceiling): Z < -8.5
            else if (gravityZ < -8.5) {
                handlePass();
                isNeutralRef.current = false; // Disarm until neutral again
            }
        });

        DeviceMotion.setUpdateInterval(100);
        return () => subscription.remove();
    }, [phase, currentIndex]); // Removed handleCorrect/handlePass from deps to allow them to be stable-ish, though they are not memoized. 
    // Ideally handleCorrect/Pass should be wrapped in useCallback but currentIndex updates anyway. 
    // Actually, `handleCorrect` calls `nextWord` which uses `currentIndex`.
    // Since `currentIndex` changes on every word, the effect re-runs. This is acceptable for Sensor subscription.

    const handleReady = () => {
        Alert.alert(
            "Ready to Start?",
            "Tap OK when the phone is on your forehead and facing the crowd!",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Start Game",
                    onPress: () => {
                        setPhase('playing');
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                }
            ]
        );
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

    const renderReady = () => (
        <View style={styles.centerContent}>
            <Text style={styles.instructionText}>Place phone on forehead</Text>
            <Text style={styles.subInstruction}>Screen facing the crowd!</Text>
            <View style={{ height: 40 }} />
            <Pressable onPress={handleReady} style={styles.readyTapArea}>
                <Text style={styles.readyTapText}>TAP TO START</Text>
            </Pressable>
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

                    <Text style={styles.hintText}>Tilt DOWN for Correct • UP to Pass</Text>
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
    }
});
