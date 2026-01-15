import { GenericModal } from '@/components/common/GenericModal';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { WavelengthData } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;
const DIAL_WIDTH = SCREEN_WIDTH - 40;
const DIAL_HEIGHT = 120; // Height of the spectrum area
const SPECTRUM_LEFT = Colors.detective;
const SPECTRUM_RIGHT = Colors.gaslightAmber;

export default function WavelengthGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Store
    const gameData = useGameStore(s => s.gameData);
    const settings = useGameStore(s => s.settings);
    const submitClue = useGameStore(s => s.submitWavelengthClue);
    const submitGuess = useGameStore(s => s.submitWavelengthGuess);
    const revealResult = useGameStore(s => s.revealWavelengthResult);
    const nextRound = useGameStore(s => s.startGame); // startGame acts as next round
    const exitGame = useGameStore(s => s.resetToHome);

    // Local State
    const [clueText, setClueText] = useState('');
    const [isPsychicReady, setIsPsychicReady] = useState(false); // To reveal screen to psychic
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [guessValue, setGuessValue] = useState(50); // 0-100 center
    const [isRevealing, setIsRevealing] = useState(false);

    // Get Psychic Player
    const players = useGameStore(s => s.players);
    const psychic = players.find(p => p.isImposter); // In Wavelength, Imposter = Psychic

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
    const { spectrum, targetValue, clue, points, guessValue: committedGuess } = data;
    const isPsychicPhase = !clue; // If no clue, it's psychic turn
    const isGuessingPhase = !!clue && committedGuess === null;
    const isResultPhase = committedGuess !== null;

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
            // Update state less frequently or on end? 
            // We need state for submit.
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
        if (isResultPhase) {
            // Animate reveal
            setIsRevealing(true);

            // 1. Move dial to guessed position (if not already there visually)
            if (committedGuess !== null) {
                dialX.value = withTiming((committedGuess / 100) * DIAL_WIDTH);
            }

            // 2. Fade in target after small delay
            setTimeout(() => {
                haptics.medium();
                targetOpacity.value = withTiming(1, { duration: 1000 });
                // Reveal score logic is handled by store update
            }, 500);
        } else {
            targetOpacity.value = 0;
        }
    }, [isResultPhase, committedGuess]);


    const handleClueSubmit = () => {
        if (!clueText.trim()) return;
        haptics.medium();
        submitClue(clueText.trim());
    };

    const handleGuessSubmit = () => {
        haptics.heavy();
        submitGuess(guessValue);
        revealResult();
    };

    const handleNextRound = () => {
        haptics.light();
        setClueText('');
        setIsPsychicReady(false);
        setGuessValue(50);
        dialX.value = 0.5 * DIAL_WIDTH;
        targetOpacity.value = 0;
        nextRound();
    };

    const handleExit = () => {
        router.replace('/');
        exitGame();
    };


    // Render Psychic Reveal Screen (Before they see target)
    if (isPsychicPhase && !isPsychicReady) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.centerContent}>
                    <Ionicons name="eye-outline" size={80} color={Colors.parchment} />
                    <Text style={styles.roleTitle}>Pass to {psychic?.name || 'Psychic'}</Text>
                    <Text style={styles.roleDesc}>
                        {psychic?.name || 'The Psychic'} needs to see the target value hidden on the spectrum.
                    </Text>

                    <Button
                        title="I am Ready"
                        onPress={() => { haptics.medium(); setIsPsychicReady(true); }}
                        variant="primary"
                        style={{ marginTop: 40, width: 200 }}
                    />
                </View>
            </View>
        );
    }

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
                    <View style={styles.scoreContainer}>
                        {/* Could show current psychic or round number here */}
                        <Text style={styles.headerTitle}>Wavelength</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} scrollEnabled={!isGuessingPhase}> {/* Disable scroll when dragging dial? Or use GH priorities */}

                    {/* Visual Spectrum Display */}
                    <View style={styles.spectrumContainer}>
                        <View style={styles.labelsRow}>
                            <Text style={styles.spectrumLabelLeft}>{spectrum.left}</Text>
                            <Text style={styles.spectrumLabelRight}>{spectrum.right}</Text>
                        </View>

                        <View style={styles.dialTrack}>
                            {/* Background Gradient or Lines */}
                            <LinearGradient
                                colors={[SPECTRUM_LEFT, Colors.parchment, SPECTRUM_RIGHT]}
                                start={{ x: 0, y: 0.5 }}
                                end={{ x: 1, y: 0.5 }}
                                style={[styles.trackGradient, { opacity: 0.3 }]}
                            />

                            {/* Target Marker (Hidden for Guessers, Visible for Psychic & Result) */}
                            {(isPsychicPhase || isResultPhase) && (
                                <Animated.View style={[styles.targetMarker, { left: `${targetValue}%` }, isResultPhase ? targetStyle : {}]}>
                                    <View style={styles.bullseye}>
                                        <View style={styles.bullseyeInner} />
                                    </View>
                                </Animated.View>
                            )}

                            {/* Target Range visual for Psychic to help them */}
                            {isPsychicPhase && (
                                <View style={[styles.targetRange, { left: `${targetValue - 10}%`, width: '20%' }]} />
                            )}

                            {/* Draggable Dial */}
                            {(isGuessingPhase || isResultPhase) && (
                                <GestureDetector gesture={pan}>
                                    <Animated.View style={[styles.dialKnob, dialStyle]}>
                                        <View style={styles.dialLine} />
                                    </Animated.View>
                                </GestureDetector>
                            )}
                        </View>

                        {isGuessingPhase && (
                            <Text style={styles.instructions}>Drag the dial to match the clue!</Text>
                        )}

                    </View>

                    {/* Phase Specific Content */}
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
                                    <Text style={styles.hintText}>Target is at {targetValue}% towards {targetValue > 50 ? spectrum.right : spectrum.left}</Text>
                                </View>
                            </View>
                        )}

                        {isGuessingPhase && (
                            <View style={styles.guessCard}>
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

                        {isResultPhase && (
                            <View style={styles.resultCard}>
                                <Text style={styles.scoreTitle}>
                                    {points === 3 ? 'BULLSEYE! 🎯' :
                                        points === 2 ? 'Close Enough! 👏' :
                                            points === 1 ? 'Kinda... 😬' : 'Way Off ❌'}
                                </Text>
                                <Text style={styles.scorePoints}>+{points} Points</Text>
                                <Text style={styles.resultDetails}>
                                    Target: {targetValue}% | Guess: {Math.round(committedGuess!)}%
                                </Text>

                                <Button
                                    title="Next Round"
                                    onPress={handleNextRound}
                                    variant="primary"
                                    style={{ marginTop: 30, width: '100%' }}
                                />
                            </View>
                        )}

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
    scoreContainer: { alignItems: 'center' },

    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 20
    },
    roleTitle: { fontSize: 32, fontWeight: '900', color: Colors.parchment, textAlign: 'center' },
    roleDesc: { fontSize: 16, color: Colors.grayLight, textAlign: 'center', lineHeight: 24 },

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
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        justifyContent: 'center'
    },
    trackGradient: {
        ...StyleSheet.absoluteFillObject,
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
        top: 0,
        bottom: 0,
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
        top: -10, // Extend slightly outside
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
    instructions: {
        textAlign: 'center',
        color: Colors.candlelight,
        marginTop: 16,
        fontStyle: 'italic'
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
    hintText: { color: Colors.candlelight, fontSize: 14, flex: 1 },

    guessCard: {
        width: '100%',
        alignItems: 'center',
        padding: 20,
    },
    clueLabel: { fontSize: 14, color: Colors.grayLight, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 },
    clueDisplay: { fontSize: 42, color: Colors.parchment, fontWeight: '900', textAlign: 'center' },

    resultCard: {
        width: '100%',
        backgroundColor: Colors.grayDark,
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.candlelight,
        shadowColor: Colors.candlelight,
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    scoreTitle: { fontSize: 24, fontWeight: 'bold', color: Colors.parchment, marginBottom: 8 },
    scorePoints: { fontSize: 48, fontWeight: '900', color: Colors.candlelight, marginBottom: 16 },
    resultDetails: { fontSize: 16, color: Colors.grayLight },
    text: { color: Colors.parchment, fontSize: 16, textAlign: 'center' },
});
