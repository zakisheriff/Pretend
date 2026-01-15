import { GenericModal } from '@/components/common/GenericModal';
import { Button } from '@/components/game/Button';
import { ScoreBoard } from '@/components/game/ScoreBoard'; // Import ScoreBoard
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { WavelengthData } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DIAL_WIDTH = SCREEN_WIDTH - 40;
const SPECTRUM_LEFT = Colors.detective;
const SPECTRUM_RIGHT = Colors.gaslightAmber;

export default function WavelengthGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Store
    const gameData = useGameStore(s => s.gameData);
    const phase = useGameStore(s => s.phase);
    const players = useGameStore(s => s.players);
    const settings = useGameStore(s => s.settings);

    const submitClue = useGameStore(s => s.submitWavelengthClue);
    const submitGuess = useGameStore(s => s.submitWavelengthGuess);
    const revealResult = useGameStore(s => s.revealWavelengthResult);
    const nextRound = useGameStore(s => s.startGame);
    const exitGame = useGameStore(s => s.resetToHome);

    // Local State
    const [clueText, setClueText] = useState('');
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [guessValue, setGuessValue] = useState(50);
    const [isRevealing, setIsRevealing] = useState(false);

    // Animations (Always call these)
    const dialX = useSharedValue(0.5 * DIAL_WIDTH);
    const targetOpacity = useSharedValue(0);

    // --- Derived State (Must be safe if gameData is null) ---
    // Safe destructuring
    const isValidGame = gameData && gameData.type === 'wavelength';
    const data = isValidGame ? (gameData.data as WavelengthData) : {
        spectrum: { left: '', right: '' },
        targetValue: 50,
        clue: null,
        clueGiverId: '',
        guesses: {},
        points: null
    };

    const { spectrum, targetValue, clue, clueGiverId, guesses } = data;

    const psychic = useMemo(() => players.find(p => p.id === clueGiverId), [players, clueGiverId]);
    const guessers = useMemo(() => players.filter(p => p.id !== clueGiverId), [players, clueGiverId]);

    const isPsychicPhase = !clue;
    const currentGuesser = useMemo(() => {
        if (!isValidGame) return null;
        if (isPsychicPhase) return null;
        return guessers.find(p => guesses[p.id] === undefined) || null;
    }, [isValidGame, guessers, guesses, isPsychicPhase]);

    const isGuessingPhase = !!currentGuesser && !isPsychicPhase && phase !== 'results';
    const isResultPhase = phase === 'results' || (!isPsychicPhase && !currentGuesser && isValidGame);

    // Side Effects
    useEffect(() => {
        setIsPlayerReady(false);
        setGuessValue(50);
        dialX.value = 0.5 * DIAL_WIDTH;
    }, [currentGuesser?.id, isPsychicPhase]);

    // Winner Navigation
    const overallWinner = useGameStore(s => s.overallWinner);
    useEffect(() => {
        if (overallWinner) {
            router.replace('/results');
        }
    }, [overallWinner]);

    useEffect(() => {
        if (isValidGame && !currentGuesser && !isPsychicPhase && phase !== 'results') {
            revealResult();
        }
        if (isResultPhase) {
            setIsRevealing(true);
            targetOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));
            runOnJS(haptics.success)();
        } else {
            targetOpacity.value = 0;
            setIsRevealing(false);
        }
    }, [isValidGame, isResultPhase, currentGuesser, isPsychicPhase, phase]);

    // Animated Styles (Always call)
    const dialStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dialX.value - 15 }]
    }));

    const targetStyle = useAnimatedStyle(() => ({
        left: `${targetValue}%`,
        opacity: targetOpacity.value
    }));

    const bubbleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dialX.value - 20 }] // Center bubble (width ~40)
    }));

    // Gestures
    const pan = Gesture.Pan()
        .onChange((e) => {
            if (!isGuessingPhase) return;
            let newX = dialX.value + e.changeX;
            if (newX < 0) newX = 0;
            if (newX > DIAL_WIDTH) newX = DIAL_WIDTH;
            dialX.value = newX;
            runOnJS(setGuessValue)((newX / DIAL_WIDTH) * 100);
        })
        .onEnd(() => {
            if (settings.hapticsEnabled) runOnJS(haptics.selection)();
        });


    // --- Early Return ONLY after all hooks ---
    if (!isValidGame) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Loading...</Text>
            </View>
        );
    }

    // Handlers
    const handleClueSubmit = () => {
        if (!clueText.trim()) return;
        haptics.heavy();
        submitClue(clueText.trim());
    };

    const handleGuessSubmit = () => {
        if (!currentGuesser) return;
        haptics.heavy();
        submitGuess(currentGuesser.id, guessValue);
        const remaining = guessers.filter(p => p.id !== currentGuesser.id && guesses[p.id] === undefined);
        if (remaining.length === 0) {
            revealResult();
        }
    };

    const handlePlayAgain = () => {
        haptics.light();
        router.replace('/select-mode');
        // Do NOT call exitGame() here; we want to preserve players/scores when going back to modes.
    };

    const handleExit = () => {
        router.replace('/');
        exitGame();
    };

    // --- RENDER HELPERS ---

    if (!isResultPhase && !isPlayerReady) {
        const targetPlayer = isPsychicPhase ? psychic : currentGuesser;
        const role = isPsychicPhase ? 'The Psychic' : 'The Guesser';
        const action = isPsychicPhase
            ? 'needs to see the target.'
            : 'needs to make their guess.';

        if (!targetPlayer) return <View style={styles.container} />;

        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                {/* Back button only for psychic phase to allow changing selection */}
                {isPsychicPhase && (
                    <Pressable
                        style={[styles.backBtn, { top: insets.top + 10, left: 20 }]}
                        onPress={() => {
                            haptics.light();
                            router.back();
                        }}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.parchment} />
                    </Pressable>
                )}

                <View style={[styles.centerContent, { paddingHorizontal: 20 }]}>
                    <Ionicons
                        name={isPsychicPhase ? "eye-outline" : "help-outline"}
                        size={80}
                        color={Colors.parchment}
                    />
                    <Text style={styles.roleTitle}>Pass to {targetPlayer?.name}</Text>
                    <Text style={styles.roleDesc}>{role} {action}</Text>

                    <Button
                        title="I am Ready"
                        onPress={() => { haptics.medium(); setIsPlayerReady(true); }}
                        variant="primary"
                        style={{ marginTop: 40, width: 200 }}
                    />
                </View>
            </View>
        );
    }

    const renderResults = () => {
        // If there's an overall winner, skip inline results - navigation will handle it
        if (overallWinner) return null;

        // Find best guess
        const bestGuess = Object.entries(guesses).reduce((best, [pid, val]) => {
            const diff = Math.abs(val - targetValue);
            return diff < best.diff ? { pid, val, diff } : best;
        }, { pid: '', val: 0, diff: 100 });

        const bestPlayer = players.find(p => p.id === bestGuess.pid);

        let message = "Round Over";
        if (bestGuess.diff <= 5) message = "Bullseye! 🎯";
        else if (bestGuess.diff <= 15) message = "Close Call! 👏";
        else message = "So Far Away... 😅";

        return (
            <View style={styles.resultsWrapper}>
                <View style={styles.resultSummary}>
                    <Text style={styles.scoreTitle}>{message}</Text>
                    <Text style={styles.resultDetails}>
                        Target was {targetValue}%
                    </Text>
                    {bestPlayer && (
                        <Text style={styles.bestGuesser}>
                            Best Guess: {bestPlayer.name} ({Math.round(bestGuess.val)}%)
                        </Text>
                    )}
                </View>

                {/* Leaderboard using ScoreBoard */}
                <ScoreBoard players={players} title="Leaderboard" />

                <View style={styles.resultActions}>
                    <Button
                        title="Play Again"
                        onPress={handlePlayAgain}
                        variant="primary"
                        icon={<Ionicons name="refresh-outline" size={20} color={Colors.victorianBlack} />}
                        style={{ flex: 1 }}
                    />
                    <Button
                        title="Home"
                        onPress={() => setShowExitConfirm(true)}
                        variant="outline"
                        icon={<Ionicons name="home-outline" size={20} color={Colors.parchment} />}
                        style={{ flex: 1 }}
                    />
                </View>
            </View>
        );
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
            >
                {/* Header */}
                <View style={[styles.header, { justifyContent: 'center' }]}>
                    <Text style={styles.headerTitle}>Wavelength</Text>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!isGuessingPhase}>
                    <View style={styles.spectrumContainer}>
                        <View style={styles.labelsRow}>
                            <Text style={styles.spectrumLabelLeft}>{spectrum.left}</Text>
                            <Text style={styles.spectrumLabelRight}>{spectrum.right}</Text>
                        </View>

                        <View style={styles.dialContainer}>
                            {/* Floating Bubble for Guess State */}
                            {isGuessingPhase && (
                                <Animated.View style={[styles.valueBubble, bubbleStyle]}>
                                    <Text style={styles.valueText}>{Math.round(guessValue)}%</Text>
                                    <View style={styles.bubbleArrow} />
                                </Animated.View>
                            )}

                            {/* Result Avatar Pins (Replaces the "white line") */}
                            {isResultPhase && Object.entries(guesses).map(([pid, val]) => {
                                const pName = players.find(p => p.id === pid)?.name.substring(0, 1) || '?';
                                return (
                                    <View key={pid} style={[styles.avatarPinContainer, { left: `${val}%` }]}>
                                        <View style={styles.avatarCircle}>
                                            <Text style={styles.avatarText}>{pName}</Text>
                                        </View>
                                        <View style={styles.avatarArrow} />
                                    </View>
                                );
                            })}

                            {/* Percentage bubble above the track for psychic */}
                            {isPsychicPhase && (
                                <View style={[styles.targetBubbleContainer, { left: `${targetValue}%` }]}>
                                    <View style={styles.targetBubble}>
                                        <Text style={styles.targetBubbleText}>{targetValue}%</Text>
                                        <View style={styles.targetBubbleArrow} />
                                    </View>
                                </View>
                            )}

                            <View style={styles.dialTrack}>
                                <LinearGradient
                                    colors={[SPECTRUM_LEFT, Colors.parchment, SPECTRUM_RIGHT]}
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 0.5 }}
                                    style={[styles.trackGradient, { opacity: 0.3 }]}
                                />

                                <Animated.View style={[styles.targetMarker, { left: `${targetValue}%` }, isResultPhase ? targetStyle : { opacity: isPsychicPhase ? 1 : 0 }]}>
                                    <View style={styles.bullseye}>
                                        <View style={styles.bullseyeInner} />
                                    </View>
                                </Animated.View>

                                {isPsychicPhase && (
                                    <View style={[styles.targetRange, { left: `${targetValue - 10}%`, width: '20%' }]} />
                                )}

                                {isGuessingPhase && (
                                    <GestureDetector gesture={pan}>
                                        <Animated.View style={[styles.dialKnob, dialStyle]}>
                                            <View style={styles.dialLine} />
                                        </Animated.View>
                                    </GestureDetector>
                                )}
                            </View>
                        </View>

                        {isGuessingPhase && (
                            <Text style={styles.instructions}>Drag to match "{clue}"</Text>
                        )}
                    </View>

                    <View style={styles.controlsArea}>
                        {isPsychicPhase && (
                            <View style={styles.inputCard}>
                                <Text style={styles.inputLabel}>Give a One Word Clue: </Text>
                                <TextInput
                                    style={styles.input}
                                    value={clueText}
                                    onChangeText={setClueText}
                                    placeholder="e.g. Coffee"
                                    placeholderTextColor={Colors.gray}
                                    autoCorrect={false}
                                    maxLength={20}
                                />
                                <Button
                                    title="Submit Clue"
                                    onPress={handleClueSubmit}
                                    variant="primary"
                                    disabled={!clueText.trim()}
                                    style={{ marginTop: 20, alignSelf: 'center', width: 200 }}
                                />
                            </View>
                        )}

                        {isGuessingPhase && (
                            <View style={styles.guessCard}>
                                <Text style={styles.turnLabel}>{currentGuesser?.name}'s Turn</Text>
                                <Text style={styles.clueLabel}>Psychic's Clue: </Text>
                                <Text style={styles.clueDisplay}>"{clue}"</Text>

                                <Button
                                    title="Lock In Guess"
                                    onPress={handleGuessSubmit}
                                    variant="primary"
                                    style={{ marginTop: 40, width: '100%' }}
                                />
                            </View>
                        )}

                        {isResultPhase && renderResults()}
                    </View>
                </ScrollView>

                <GenericModal
                    visible={showExitConfirm}
                    title="Quit Game?"
                    message="Progress will be lost."
                    confirmLabel="Quit"
                    isDestructive
                    onConfirm={handleExit}
                    onCancel={() => setShowExitConfirm(false)}
                />
            </KeyboardAvoidingView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 10,
    },
    closeBtn: { width: 40, height: 40, paddingHorizontal: 0 },
    backBtn: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.grayDark,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    headerTitle: { color: Colors.parchment, fontSize: 18, fontWeight: 'bold' },

    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 20
    },
    roleTitle: { fontSize: 32, fontWeight: '900', color: Colors.parchment, textAlign: 'center' },
    roleDesc: { fontSize: 16, color: Colors.grayLight, textAlign: 'center', lineHeight: 24, marginTop: 10 },

    scrollContent: { paddingBottom: 40 },

    spectrumContainer: {
        marginTop: 20,
        paddingHorizontal: 20,
        marginBottom: 40,
    },
    labelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    spectrumLabelLeft: { fontSize: 20, fontWeight: 'bold', color: SPECTRUM_LEFT, width: '45%' },
    spectrumLabelRight: { fontSize: 20, fontWeight: 'bold', color: SPECTRUM_RIGHT, textAlign: 'right', width: '45%' },

    dialContainer: {
        marginTop: 45, // Increased margin to fit avatars
        position: 'relative'
    },

    dialTrack: {
        height: 80,
        backgroundColor: Colors.grayDark,
        borderRadius: 40,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        justifyContent: 'center'
    },
    trackGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 38,
    },
    targetRange: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)'
    },
    targetMarker: {
        position: 'absolute',
        top: -5,
        bottom: -5,
        width: 4,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    bullseye: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.suspect,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.victorianBlack
    },
    bullseyeInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: Colors.parchment
    },
    targetBubbleContainer: {
        position: 'absolute',
        top: -45,
        width: 0,
        alignItems: 'center',
        zIndex: 20,
    },
    targetBubble: {
        backgroundColor: Colors.suspect,
        paddingVertical: 6,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 46,
    },
    targetBubbleText: {
        fontWeight: '900',
        color: Colors.parchment,
        fontSize: 14,
        textAlign: 'center',
    },
    targetBubbleArrow: {
        position: 'absolute',
        bottom: -6,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: Colors.suspect,
    },

    dialKnob: {
        position: 'absolute',
        top: -10,
        bottom: -10,
        width: 30,
        backgroundColor: Colors.parchment,
        borderRadius: 15,
        borderWidth: 4,
        borderColor: Colors.victorianBlack,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 5,
        elevation: 5,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center'
    },
    dialLine: {
        width: 2,
        height: '100%',
        backgroundColor: Colors.victorianBlack
    },

    // Bubble & Avatar Pins
    valueBubble: {
        position: 'absolute',
        top: -40,
        backgroundColor: Colors.parchment,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.victorianBlack,
        zIndex: 20,
    },
    bubbleArrow: {
        position: 'absolute',
        bottom: -6,
        width: 0,
        height: 0,
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: Colors.victorianBlack,
    },
    valueText: {
        fontWeight: '900',
        color: Colors.victorianBlack,
        fontSize: 12
    },

    // New Avatar Pin Style
    avatarPinContainer: {
        position: 'absolute',
        top: -42, // Positioned above the track
        width: 0, // Zero width to center properly
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 15,
        overflow: 'visible'
    },
    avatarCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: Colors.parchment,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.victorianBlack,
        zIndex: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '900',
        color: Colors.victorianBlack,
    },
    avatarArrow: {
        marginTop: -1, // Overlap slightly
        width: 0,
        height: 0,
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: Colors.victorianBlack,
    },

    instructions: {
        textAlign: 'center',
        color: Colors.candlelight,
        marginTop: 16,
        fontStyle: 'italic',
        fontSize: 16
    },

    controlsArea: {
        paddingHorizontal: 20,
        alignItems: 'center',
        width: '100%',
    },
    inputCard: {
        width: '100%',
        backgroundColor: Colors.grayDark,
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.grayMedium
    },
    inputLabel: { fontSize: 16, color: Colors.parchment, marginBottom: 16 },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: Colors.victorianBlack,
        borderRadius: 12,
        paddingHorizontal: 16,
        color: Colors.parchment,
        fontSize: 20,
        textAlign: 'center',
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: Colors.gray
    },
    hintBox: { flexDirection: 'row', marginTop: 16, gap: 8, alignItems: 'center' },
    hintText: { color: Colors.candlelight, fontSize: 14, flex: 1 },

    guessCard: {
        width: '100%',
        alignItems: 'center',
        padding: 20,
    },
    turnLabel: { fontSize: 22, color: Colors.candlelight, fontWeight: 'bold', marginBottom: 20 },
    clueLabel: { fontSize: 14, color: Colors.grayLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 },
    clueDisplay: { fontSize: 36, color: Colors.parchment, fontWeight: '900', textAlign: 'center' },

    resultsWrapper: {
        width: '100%',
        gap: 20,
    },
    resultSummary: {
        alignItems: 'center',
        marginBottom: 10,
    },
    resultTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.parchment, marginBottom: 8 },
    resultDetails: { fontSize: 16, color: Colors.grayLight, marginBottom: 4, paddingHorizontal: 20 },
    bestGuesser: { fontSize: 16, color: Colors.success, fontWeight: 'bold' },

    resultActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    scoreTitle: { fontSize: 28, fontWeight: 'bold', color: Colors.parchment, marginBottom: 8 },
    scorePoints: { fontSize: 48, fontWeight: '900', color: Colors.candlelight, marginBottom: 16 },
    text: { color: Colors.parchment, fontSize: 16, textAlign: 'center' },
    scoreList: { width: '100%', gap: 10, marginBottom: 20 },
    scoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
        padding: 12,
        borderRadius: 10
    },
    scoreRank: { color: Colors.grayLight, fontSize: 14, width: 30 },
    scoreName: { color: Colors.parchment, fontSize: 16, flex: 1, fontWeight: 'bold' },
    scoreValue: { color: Colors.grayLight, fontSize: 14, marginRight: 10 },
    scoreDiff: { fontSize: 14, fontWeight: 'bold' },
    finalTargetInfo: {
        padding: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        marginBottom: 10
    }
});
