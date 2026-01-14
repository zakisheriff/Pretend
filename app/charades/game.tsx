import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { CharadesData } from '@/types/game';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { DeviceMotion } from 'expo-sensors';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CharadesGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const gameData = useGameStore((s) => s.gameData);
    const players = useGameStore((s) => s.players);
    const updatePlayerName = useGameStore((s) => s.updatePlayerName); // Cheaty way to update score? No, need direct set.
    // Actually, I can't update score directly via existing mutations easily without weird hacks.
    // But `players` in store IS the state. I can mutate it directly via `reorderPlayers` or I should add `updateScore`.
    // Wait, `calculateRoundScores` handles score updates.
    // I should create a local score, and then applying it to the player at the end.

    // Safety check for data with HARD fallback
    const charadesData = gameData?.data as CharadesData | undefined;

    // Fallback list if store data fails
    const FALLBACK_WORDS = ['Spiderman', 'Batman', 'Pizza', 'Zombie', 'Elvis', 'Robot', 'Monkey', 'Doctor', 'Teacher', 'Ninja'];

    const words = (charadesData?.words && charadesData.words.length > 0) ? charadesData.words : FALLBACK_WORDS;
    const duration = charadesData?.duration || 60;
    const playerId = charadesData?.selectedPlayerId;

    const currentPlayer = players.find(p => p.id === playerId);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [correctCount, setCorrectCount] = useState(0); // Distinct from score points
    const [timeLeft, setTimeLeft] = useState(duration);

    // Phases: 'setup' -> 'ready' -> 'playing' -> 'results'
    const [phase, setPhase] = useState<'setup' | 'ready' | 'playing' | 'results'>('setup');

    // Feedback state
    // Feedback state
    const [feedback, setFeedback] = useState<'none' | 'correct' | 'pass'>('none');

    // Refs for sensor logic
    const lastTriggerTime = useRef(0);
    const isGameActiveRef = useRef(false);
    const isNeutralRef = useRef(false); // Must return to vertical to re-arm
    const TRIGGER_DELAY = 1000;
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        // Lock to landscape for Charades
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

        // Reset state
        isGameActiveRef.current = false;
        isNeutralRef.current = false;

        return () => {
            // Cleanup handled in finishGame or unmount
            if (timerRef.current) clearInterval(timerRef.current);
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT);
        };
    }, []);

    useEffect(() => {
        let timer: any;
        if (phase === 'playing') {
            // 3-Second buffer.
            setTimeout(() => {
                isGameActiveRef.current = true;
                // We don't set neutral true here; user must physically move to neutral.
            }, 3000);

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
        return () => clearfix(timer);
    }, [phase]);

    function clearfix(t: any) { if (t) clearInterval(t); }

    // ... handleCorrect, handlePass ...

    useEffect(() => {
        if (phase !== 'playing') return;

        const subscription = DeviceMotion.addListener((data) => {
            if (!isGameActiveRef.current) return;
            const gravityZ = data.accelerationIncludingGravity?.z;
            if (gravityZ === undefined) return;

            // NEUTRAL ZONE (Vertical / Forehead): Z between -3 and 3
            if (gravityZ > -4 && gravityZ < 4) {
                isNeutralRef.current = true;
                return;
            }

            // If not neutral yet, ignore tilts
            if (!isNeutralRef.current) return;

            // CORRECT (Tilt Down/Floor): Z > 7.0
            if (gravityZ > 7.0) {
                handleCorrect();
                isNeutralRef.current = false; // Disarm until neutral again
            }
            // PASS (Tilt Up/Ceiling): Z < -7.0
            else if (gravityZ < -7.0) {
                handlePass();
                isNeutralRef.current = false; // Disarm until neutral again
            }
        });

        DeviceMotion.setUpdateInterval(100);
        return () => subscription.remove();
    }, [phase, currentIndex]);

    const finishGame = () => {
        setPhase('results');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Calculate Points
        let points = 0;
        if (duration === 30 && correctCount > 5) points = 1;
        if (duration === 60 && correctCount > 10) points = 2;

        // We need to update the store with these points.
        // Since I didn't add a dedicated `addScore` action, I'll use a trick or just admit I need to add that action.
        // Wait, I can use `reorderPlayers` which replaces the whole player array.
        // Let's effectively "update" the player in the store.
        if (currentPlayer && points > 0) {
            const updatedPlayers = players.map(p =>
                p.id === currentPlayer.id ? { ...p, score: p.score + points } : p
            );
            // Call reorderPlayers (which just blindly sets players)
            useGameStore.getState().reorderPlayers(updatedPlayers);
        }
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
        setCorrectCount(c => c + 1);

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
        if (phase !== 'playing') return;

        const subscription = DeviceMotion.addListener((data) => {
            if (!data.rotation) return;
            const { gamma } = data.rotation; // Gamma is roll (landscape title)

            // Tilt DOWN (Correct) -> Gamma > 2.2
            // Tilt UP (Pass) -> Gamma < 0.8

            if (gamma > 2.2) {
                handleCorrect();
            } else if (gamma < 0.8 && gamma > -1.0) {
                handlePass();
            }
        });

        DeviceMotion.setUpdateInterval(100);
        return () => subscription.remove();
    }, [phase, currentIndex]);

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
    const passColor = (Colors as any).imposter || '#FF4444';
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

            {phase === 'results' && (
                <View style={styles.centerContent}>
                    <Text style={styles.gameOverTitle}>Time's Up!</Text>
                    <Text style={styles.finalCount}>{correctCount}</Text>
                    <Text style={styles.scoreLabel}>WORDS CORRECT </Text>

                    {/* Points earned message */}
                    <Text style={styles.pointsEarned}>
                        {(duration === 30 && correctCount > 5) || (duration === 60 && correctCount > 10)
                            ? `+ ${(duration === 60 && correctCount > 10) ? 2 : 1} POINTS EARNED!`
                            : "No points earned."}
                    </Text>

                    {/* Mini Leaderboard */}
                    <View style={styles.leaderboard}>
                        <Text style={styles.leaderboardTitle}>Standings</Text>
                        {players.sort((a, b) => b.score - a.score).map((p, i) => (
                            <View key={p.id} style={styles.leaderboardRow}>
                                <Text style={[styles.lbName, p.id === currentPlayer?.id && styles.highlightName]}>
                                    {i + 1}. {p.name}
                                </Text>
                                <Text style={styles.lbScore}>{p.score}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.footerButtons}>
                        <Pressable onPress={() => router.replace('/game-settings')} style={styles.secondaryButton}>
                            <Text style={styles.secondaryButtonText}>Play Again</Text>
                        </Pressable>
                        <Pressable onPress={() => router.replace('/')} style={styles.finishLink}>
                            <Text style={styles.finishLinkText}>Home</Text>
                        </Pressable>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: 'black' },
    centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10, padding: 20 },
    gameContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

    header: { position: 'absolute', top: 20, left: 40, right: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    timer: { fontSize: 32, fontWeight: 'bold', color: Colors.candlelight, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
    scoreCounter: { fontSize: 24, fontWeight: 'bold', color: Colors.success },

    instructionText: { fontSize: 32, fontWeight: 'bold', color: Colors.parchment, textAlign: 'center' },
    subInstruction: { fontSize: 20, color: Colors.grayLight, textAlign: 'center', fontStyle: 'italic' },

    readyTapArea: { marginTop: 40, paddingHorizontal: 60, paddingVertical: 30, backgroundColor: Colors.candlelight, borderRadius: 50 },
    readyTapText: { fontSize: 28, fontWeight: '900', color: Colors.victorianBlack },

    wordContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    wordText: { fontSize: 80, fontWeight: '900', color: Colors.white, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 10 },
    feedbackText: { fontSize: 60, fontWeight: '900', textTransform: 'uppercase', textAlign: 'center' },
    hintText: { fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },

    gameOverTitle: { fontSize: 40, fontWeight: 'bold', color: Colors.parchment },
    finalCount: { fontSize: 80, fontWeight: '900', color: Colors.success },
    scoreLabel: { fontSize: 20, color: Colors.grayLight, marginBottom: 10 },
    pointsEarned: { fontSize: 24, fontWeight: 'bold', color: Colors.candlelight, marginBottom: 30 },

    title: { fontSize: 24, color: Colors.grayLight },
    playerText: { fontSize: 48, fontWeight: '900', color: Colors.parchment, marginVertical: 10 },
    subText: { fontSize: 18, color: Colors.grayLight, marginBottom: 30 },

    primaryButton: { backgroundColor: Colors.candlelight, paddingHorizontal: 40, paddingVertical: 15, borderRadius: 30 },
    buttonText: { fontSize: 20, fontWeight: 'bold', color: Colors.victorianBlack },

    secondaryButton: { backgroundColor: Colors.grayDark, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 30, borderWidth: 1, borderColor: Colors.grayMedium },
    secondaryButtonText: { fontSize: 18, color: Colors.parchment, fontWeight: 'bold' },

    finishLink: { padding: 10 },
    finishLinkText: { color: Colors.grayLight, fontSize: 16, textDecorationLine: 'underline' },

    // Results are now in Portrait, so we can use standard vertical layout
    leaderboard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.1)', padding: 15, borderRadius: 10, marginVertical: 20 },
    leaderboardTitle: { color: Colors.parchment, fontSize: 18, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
    leaderboardRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    lbName: { color: Colors.grayLight, fontSize: 16 },
    highlightName: { color: Colors.candlelight, fontWeight: 'bold' },
    lbScore: { color: Colors.parchment, fontWeight: 'bold' },

    footerButtons: { flexDirection: 'row', gap: 20, alignItems: 'center', marginTop: 10 }
});
