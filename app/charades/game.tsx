import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { CharadesData } from '@/types/game';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function CharadesGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gameData = useGameStore((s) => s.gameData);

    // Safety check for data
    const charadesData = gameData?.data as CharadesData | undefined;
    const words = charadesData?.words || [];
    const duration = charadesData?.duration || 60;

    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(duration);
    const [isActive, setIsActive] = useState(false); // Start false, wait for "Place on Forehead"
    const [gameStatus, setGameStatus] = useState<'waiting' | 'playing' | 'finished'>('waiting');

    // Feedback state
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'pass'>('none');

    // Refs for sensor delay logic to prevent double triggers
    const lastTriggerTime = useRef(0);
    const TRIGGER_DELAY = 1000; // 1 second between triggers

    useEffect(() => {
        // Lock to landscape for Charades
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

        return () => {
            // Reset to portrait on exit
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        };
    }, []);

    useEffect(() => {
        let timer: any;
        if (isActive && timeLeft > 0) {
            timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        finishGame();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(timer);
    }, [isActive, timeLeft]);

    const finishGame = () => {
        setIsActive(false);
        setGameStatus('finished');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

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
        setScore(s => s + 1);

        // Show feedback then next word
        setTimeout(() => {
            setFeedback('none');
            nextWord();
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
            setFeedback('none');
            nextWord();
        }, 800);
    };


    useEffect(() => {
        if (gameStatus !== 'playing') return;

        // Sensor subscription
        const subscription = DeviceMotion.addListener((data) => {
            if (!data.rotation) return;

            const { gamma } = data.rotation;

            // Simple Logic:
            // If Gamma > 2.2 (Tilt Down/Forward) -> Correct
            // If Gamma < 0.8 (Tilt Up/Back) -> Pass

            if (gamma > 2.2) { // Tilted 'Down' significantly
                handleCorrect();
            } else if (gamma < 0.8 && gamma > -1.0) { // Tilted 'Up' significantly
                handlePass();
            }
        });

        DeviceMotion.setUpdateInterval(100);

        return () => subscription.remove();
    }, [gameStatus, currentIndex, words]);


    const startGame = () => {
        setGameStatus('playing');
        setIsActive(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const returnHome = () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        router.replace('/');
    };

    const currentWord = words[currentIndex] || "Finished!";

    // Colors.imposter might not exist directly if not defined, fallback to a red
    const passColor = (Colors as any).imposter || '#FF4444';
    const feedbackColor = feedback === 'correct' ? Colors.success : feedback === 'pass' ? passColor : 'transparent';

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={feedback === 'none' ? [Colors.victorianBlack, '#1a1a1a'] : [feedbackColor, Colors.victorianBlack]}
                style={StyleSheet.absoluteFill}
            />

            {gameStatus === 'waiting' && (
                <View style={styles.centerContent}>
                    <Text style={[styles.instructionText, { marginBottom: 20 }]}>Place phone on forehead</Text>
                    <Text style={styles.subInstruction}>Screen facing the crowd!</Text>
                    <Pressable onPress={startGame} style={styles.startButton}>
                        <Text style={styles.startButtonText}>TAP TO START</Text>
                    </Pressable>
                </View>
            )}

            {gameStatus === 'playing' && (
                <View style={styles.gameContent}>
                    <View style={styles.header}>
                        <Text style={styles.timer}>{timeLeft}</Text>
                        <Text style={styles.score}>Score: {score}</Text>
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

            {gameStatus === 'finished' && (
                <View style={styles.centerContent}>
                    <Text style={styles.gameOverTitle}>Time's Up!</Text>
                    <Text style={styles.finalScore}>{score}</Text>
                    <Text style={styles.scoreLabel}>POINTS</Text>

                    <Pressable onPress={returnHome} style={styles.finishButton}>
                        <Text style={styles.finishButtonText}>Finish</Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 15
    },
    gameContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    header: {
        position: 'absolute',
        top: 20,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timer: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.candlelight,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    score: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.success,
    },
    instructionText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.parchment,
        textAlign: 'center'
    },
    subInstruction: {
        fontSize: 20,
        color: Colors.grayLight,
        textAlign: 'center',
        fontStyle: 'italic'
    },
    startButton: {
        marginTop: 40,
        paddingHorizontal: 40,
        paddingVertical: 20,
        backgroundColor: Colors.candlelight,
        borderRadius: 50,
    },
    startButtonText: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.victorianBlack,
    },
    wordContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    wordText: {
        fontSize: 80, // HUGE text for visibility from afar
        fontWeight: '900',
        color: Colors.white,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 10,
    },
    feedbackText: {
        fontSize: 60,
        fontWeight: '900',
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    hintText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 20,
    },
    gameOverTitle: {
        fontSize: 40,
        fontWeight: 'bold',
        color: Colors.parchment,
    },
    finalScore: {
        fontSize: 100,
        fontWeight: '900',
        color: Colors.success,
    },
    scoreLabel: {
        fontSize: 24,
        color: Colors.grayLight,
        marginBottom: 40,
    },
    finishButton: {
        paddingHorizontal: 50,
        paddingVertical: 15,
        backgroundColor: Colors.grayDark,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    finishButtonText: {
        fontSize: 20,
        color: Colors.parchment,
        fontWeight: 'bold'
    }
});
