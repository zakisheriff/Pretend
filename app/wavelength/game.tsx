import { GenericModal } from '@/components/common/GenericModal';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { WavelengthData } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DIAL_WIDTH = SCREEN_WIDTH - 40;
// const DIAL_HEIGHT = 120; // Unused
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
    const [isPlayerReady, setIsPlayerReady] = useState(false); // Controls "Pass to X" screen
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [guessValue, setGuessValue] = useState(50); // 0-100 center
    const [isRevealing, setIsRevealing] = useState(false);

    // Animations
    const dialX = useSharedValue(0.5 * DIAL_WIDTH); // Start center
    const targetOpacity = useSharedValue(0);

    // Safety check
    if (!gameData || gameData.type !== 'wavelength') {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Loading...</Text>
            </View>
        );
    }

    const data = gameData.data as WavelengthData;
    const { spectrum, targetValue, clue, clueGiverId, guesses } = data;

    // Derived State
    const psychic = useMemo(() => players.find(p => p.id === clueGiverId), [players, clueGiverId]);
    const guessers = useMemo(() => players.filter(p => p.id !== clueGiverId), [players, clueGiverId]);

    // Determine current active player and phase logic
    const isPsychicPhase = !clue;

    // Find the first guesser who hasn't guessed yet
    const currentGuesser = useMemo(() => {
        if (isPsychicPhase) return null;
        return guessers.find(p => guesses[p.id] === undefined) || null;
    }, [guessers, guesses, isPsychicPhase]);

    const isGuessingPhase = !!currentGuesser && !isPsychicPhase && phase !== 'results';
    const isResultPhase = phase === 'results' || (!isPsychicPhase && !currentGuesser);

    // Reset local state when player changes
    useEffect(() => {
        setIsPlayerReady(false);
        setGuessValue(50);
        dialX.value = 0.5 * DIAL_WIDTH;
    }, [currentGuesser?.id, isPsychicPhase]);

    // Dial Gesture
    const pan = Gesture.Pan()
        .onChange((e) => {
            if (!isGuessingPhase) return;
            // Map movement to 0-100
            let newX = dialX.value + e.changeX;
            // Clamp
            if (newX < 0) newX = 0;
            if (newX > DIAL_WIDTH) newX = DIAL_WIDTH;

            dialX.value = newX;
            runOnJS(setGuessValue)((newX / DIAL_WIDTH) * 100);
        })
        .onEnd(() => {
            if (settings.hapticsEnabled) runOnJS(haptics.selection)();
        });

    const dialStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dialX.value - 15 }] // Center knob (30px width)
    }));

    const targetStyle = useAnimatedStyle(() => ({
        left: `${targetValue}%`,
        opacity: targetOpacity.value
    }));

    // Effects
    useEffect(() => {
        // If we naturally ran out of guessers but phase isn't 'results' yet, force it (safety)
        if (!currentGuesser && !isPsychicPhase && phase !== 'results') {
            revealResult();
        }

        if (isResultPhase) {
            setIsRevealing(true);
            // Animate target reveal
            targetOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));
            runOnJS(haptics.success)();
        } else {
            targetOpacity.value = 0;
            setIsRevealing(false);
        }
    }, [isResultPhase, currentGuesser, isPsychicPhase, phase]);


    const handleClueSubmit = () => {
        if (!clueText.trim()) return;
        haptics.heavy();
        submitClue(clueText.trim());
        // Phase will switch implies currentGuesser will become defined, triggering useEffect reset
    };

    const handleGuessSubmit = () => {
        if (!currentGuesser) return;
        haptics.heavy();
        submitGuess(currentGuesser.id, guessValue);

        // If this was the last guesser, the effect above or next render will handle transition
        // We rely on 'currentGuesser' becoming null to know we are done.
        const remaining = guessers.filter(p => p.id !== currentGuesser.id && guesses[p.id] === undefined);
        if (remaining.length === 0) {
            revealResult();
        }
    };

    const handleNextRound = () => {
        haptics.light();
        setClueText('');
        nextRound();
    };

    const handleExit = () => {
        router.replace('/');
        exitGame();
    };

    // --- RENDER HELPERS ---

    // 1. Pass to Player Screen
    if (!isResultPhase && !isPlayerReady) {
        const targetPlayer = isPsychicPhase ? psychic : currentGuesser;
        const role = isPsychicPhase ? 'The Psychic' : 'The Guesser';
        const action = isPsychicPhase
            ? 'needs to see the target.'
            : 'needs to make their guess.';

        // Prevent flash of null
        if (!targetPlayer) return <View style={styles.container} />;

        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
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

    // 2. Result Screen Logic
    const renderResults = () => {
        // Calculate Winners
        const scores = Object.entries(guesses).map(([pid, val]) => {
            const player = players.find(p => p.id === pid);
            if (!player) return null;
            const diff = Math.abs(val - targetValue);
            return { player, val, diff };
        }).filter(Boolean) as { player: any, val: number, diff: number }[];

        // Sort by closest
        scores.sort((a, b) => a.diff - b.diff);

        const winner = scores[0];

        return (
            <View style={styles.resultCard}>
                <Text style={styles.scoreTitle}>
                    {winner ? `${winner.player.name} wins!` : 'Round Over'}
                </Text>

                {winner && (
                    <Text style={styles.scorePoints}>
                        {winner.diff <= 5 ? 'BULLSEYE! 🎯' : winner.diff <= 15 ? 'Close! 👏' : 'Nice Try 👍'}
                    </Text>
                )}

                <View style={styles.scoreList}>
                    {scores.map((s, i) => (
                        <View key={s.player.id} style={styles.scoreRow}>
                            <Text style={styles.scoreRank}>#{i + 1}</Text>
                            <Text style={styles.scoreName}>{s.player.name}</Text>
                            <Text style={styles.scoreValue}>{Math.round(s.val)}%</Text>
                            <Text style={[styles.scoreDiff, { color: s.diff <= 10 ? Colors.success : Colors.imposter }]}>
                                (-{Math.round(s.diff)})
                            </Text>
                        </View>
                    ))}
                </View>

                {/* Target Reveal */}
                <View style={styles.finalTargetInfo}>
                    <Text style={styles.resultDetails}>Target was {targetValue}%</Text>
                </View>

                <Button
                    title="Next Round"
                    onPress={handleNextRound}
                    variant="primary"
                    style={{ marginTop: 20, width: '100%' }}
                />
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
                <View style={styles.header}>
                    <Button
                        title=""
                        icon={<Ionicons name="close" size={24} color={Colors.grayLight} />}
                        onPress={() => setShowExitConfirm(true)}
                        variant="ghost"
                        style={styles.closeBtn}
                    />
                    <Text style={styles.headerTitle}>Wavelength</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!isGuessingPhase}>

                    {/* Visual Spectrum Display */}
                    <View style={styles.spectrumContainer}>
                        <View style={styles.labelsRow}>
                            <Text style={styles.spectrumLabelLeft}>{spectrum.left}</Text>
                            <Text style={styles.spectrumLabelRight}>{spectrum.right}</Text>
                        </View>

                        <View style={styles.dialTrack}>
                            {/* Background Gradient */}
                            <LinearGradient
                                colors={[SPECTRUM_LEFT, Colors.parchment, SPECTRUM_RIGHT]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={[styles.trackGradient, { opacity: 0.3 }]}
                            />

                            {/* Target Marker */}
                            <Animated.View style={[styles.targetMarker, { left: `${targetValue}%` }, isResultPhase ? targetStyle : { opacity: isPsychicPhase ? 1 : 0 }]}>
                                <View style={styles.bullseye}>
                                    <View style={styles.bullseyeInner} />
                                </View>
                            </Animated.View>

                            {/* Target Range (Psychic Only) */}
                            {isPsychicPhase && (
                                <View style={[styles.targetRange, { left: `${targetValue - 10}%`, width: '20%' }]} />
                            )}

                            {/* Active Draggable Dial (Guessing Phase) */}
                            {isGuessingPhase && (
                                <GestureDetector gesture={pan}>
                                    <Animated.View style={[styles.dialKnob, dialStyle]}>
                                        <View style={styles.dialLine} />
                                    </Animated.View>
                                </GestureDetector>
                            )}

                            {/* Result Phase: Show ALL Guesses */}
                            {isResultPhase && Object.entries(guesses).map(([pid, val]) => {
                                const pName = players.find(p => p.id === pid)?.name.substring(0, 1) || '?';
                                return (
                                    <View key={pid} style={[styles.resultPin, { left: `${val}%` }]}>
                                        <View style={styles.pinHead}>
                                            <Text style={styles.pinText}>{pName}</Text>
                                        </View>
                                        <View style={styles.pinStick} />
                                    </View>
                                );
                            })}
                        </View>

                        {isGuessingPhase && (
                            <Text style={styles.instructions}>Drag to match "{clue}"</Text>
                        )}
                    </View>

                    {/* Active Phase Controls */}
                    <View style={styles.controlsArea}>

                        {isPsychicPhase && (
                            <View style={styles.inputCard}>
                                <Text style={styles.inputLabel}>Give a one-word clue:</Text>
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
                                    style={{ marginTop: 20, width: '100%' }}
                                />
                                <View style={styles.hintBox}>
                                    <Ionicons name="information-circle-outline" size={20} color={Colors.candlelight} />
                                    <Text style={styles.hintText}>Target is at {targetValue}%</Text>
                                </View>
                            </View>
                        )}

                        {isGuessingPhase && (
                            <View style={styles.guessCard}>
                                <Text style={styles.turnLabel}>{currentGuesser?.name}'s Turn</Text>
                                <Text style={styles.clueLabel}>Psychic's Clue:</Text>
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

    dialTrack: {
        height: 80,
        backgroundColor: Colors.grayDark,
        borderRadius: 40,
        position: 'relative',
        // overflow: 'hidden', // Disabled to let result pins stick out
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        justifyContent: 'center',
        zIndex: 5
    },
    trackGradient: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 38, // Match track roundedness
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

    dialKnob: {
        position: 'absolute',
        top: -10,
        bottom: -10,
        width: 30,
        backgroundColor: Colors.parchment,
        borderRadius: 15,
        borderWidth: 4,
        borderColor: Colors.victorianBlack,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    dialLine: {
        width: 2,
        height: '100%',
        backgroundColor: Colors.victorianBlack
    },

    // Result Pins
    resultPin: {
        position: 'absolute',
        top: -40,
        bottom: 0,
        width: 2,
        alignItems: 'center',
        justifyContent: 'flex-start',
        zIndex: 8,
    },
    pinHead: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.grayLight,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.victorianBlack,
        marginBottom: 0,
        zIndex: 9
    },
    pinText: { fontSize: 10, fontWeight: 'bold', color: Colors.victorianBlack },
    pinStick: {
        width: 2,
        height: 56, // Reach down to track center
        backgroundColor: Colors.grayLight,
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
        alignItems: 'center'
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
    hintText: { color: Colors.candlelight, fontSize: 14 },

    guessCard: {
        width: '100%',
        alignItems: 'center',
        padding: 20,
    },
    turnLabel: { fontSize: 22, color: Colors.candlelight, fontWeight: 'bold', marginBottom: 20 },
    clueLabel: { fontSize: 14, color: Colors.grayLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 },
    clueDisplay: { fontSize: 36, color: Colors.parchment, fontWeight: '900', textAlign: 'center' },

    resultCard: {
        width: '100%',
        backgroundColor: Colors.grayDark,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.candlelight,
    },
    scoreTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.parchment, marginBottom: 4 },
    scorePoints: { fontSize: 32, fontWeight: '900', color: Colors.candlelight, marginBottom: 20 },
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
    },
    resultDetails: { fontSize: 14, color: Colors.grayLight },
    text: { color: Colors.parchment, fontSize: 16, textAlign: 'center' },
});
