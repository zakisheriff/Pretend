import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Button } from './Button';

const SCREEN_WIDTH = Dimensions.get('window').width;
const MAX_DIAL_WIDTH = 500;
const DIAL_WIDTH = Math.min(SCREEN_WIDTH - 60, MAX_DIAL_WIDTH);
const SPECTRUM_LEFT = Colors.detective;
const SPECTRUM_RIGHT = Colors.gaslightAmber;

// Unified Layout Constants
const KNOB_WIDTH = 36;
const TARGET_WIDTH = 40;
const BUBBLE_WIDTH = 60;
const TRACK_MARGIN = 22; // Margin from track edge to center of 0/100 markers

const valueToX = (v: number) => TRACK_MARGIN + (v / 100) * (DIAL_WIDTH - 2 * TRACK_MARGIN);

interface WavelengthViewProps {
    players: Player[];
    myPlayerId: string;
    roomCode: string;
    gamePhase: string;
    isHost: boolean;
}

export function WavelengthView({ players, myPlayerId, roomCode, gamePhase, isHost }: WavelengthViewProps) {
    const myPlayer = players.find(p => p.id === myPlayerId);
    const isPsychic = myPlayer?.role === 'psychic';

    // Parse Data from secretWord
    const data = useMemo(() => {
        if (!myPlayer?.secretWord) return { left: 'Left', right: 'Right', target: 50, clue: null };
        try {
            const d = JSON.parse(myPlayer.secretWord);
            return {
                left: d.left || 'Left',
                right: d.right || 'Right',
                target: d.target, // null for guessers during non-reveal
                clue: d.clue || null
            };
        } catch (e) {
            return { left: 'Left', right: 'Right', target: 50, clue: null };
        }
    }, [myPlayer?.secretWord]);

    const { left, right, target, clue } = data;

    // Dial State
    const dialX = useSharedValue(0.5 * DIAL_WIDTH);
    const [guessValue, setGuessValue] = useState(50);
    const [clueText, setClueText] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Sync Dial with existing vote if present
    useEffect(() => {
        if (myPlayer?.vote) {
            const v = parseInt(myPlayer.vote);
            if (!isNaN(v)) {
                setGuessValue(v);
                dialX.value = (v / 100) * DIAL_WIDTH;
                setHasSubmitted(true);
            }
        }
    }, [myPlayer?.vote]);

    const pan = Gesture.Pan()
        .onChange((e) => {
            if (isPsychic || hasSubmitted || gamePhase === 'results') return;
            let newX = dialX.value + e.changeX;
            // Constrain knob center within visual track ranges
            if (newX < TRACK_MARGIN) newX = TRACK_MARGIN;
            if (newX > DIAL_WIDTH - TRACK_MARGIN) newX = DIAL_WIDTH - TRACK_MARGIN;
            dialX.value = newX;

            // Map TRACK_MARGIN..DIAL_WIDTH-TRACK_MARGIN back to 0..100
            const percentage = ((newX - TRACK_MARGIN) / (DIAL_WIDTH - 2 * TRACK_MARGIN)) * 100;
            runOnJS(setGuessValue)(percentage);
        })
        .onEnd(() => {
            runOnJS(haptics.selection)();
        });

    const handleClueSubmit = async () => {
        if (!clueText.trim()) return;
        haptics.heavy();
        await GameAPI.setWavelengthClue(roomCode, clueText.trim());
    };

    const handleGuessSubmit = async () => {
        haptics.heavy();
        setHasSubmitted(true);
        // Cast vote saves the percentage (0-100)
        await GameAPI.castVote(myPlayerId, Math.round(guessValue).toString());
    };

    const handleReveal = async () => {
        haptics.success();
        await GameAPI.revealWavelength(roomCode);
    };

    // Animated Styles - All use absolute coordinates from left: 0
    const dialStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dialX.value - (KNOB_WIDTH / 2) }]
    }));

    const bubbleStyle = useAnimatedStyle(() => {
        // Psychic bubble tracks the target, Guesser bubble tracks dialX
        const x = isPsychic ? valueToX(target !== undefined ? target : 50) : dialX.value;
        return {
            transform: [{ translateX: x - (BUBBLE_WIDTH / 2) }]
        };
    });

    const targetVisibility = useSharedValue(0);
    useEffect(() => {
        targetVisibility.value = withTiming((isPsychic || gamePhase === 'results') ? 1 : 0);

        // Ensure dialX is centered at start for guessers
        if (!hasSubmitted && !myPlayer?.vote) {
            dialX.value = valueToX(50);
            setGuessValue(50);
        }
    }, [isPsychic, gamePhase]);

    const targetStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: valueToX(target !== undefined ? target : 50) - (TARGET_WIDTH / 2) }
        ],
        opacity: targetVisibility.value,
    }));

    const isGuessing = !isPsychic && gamePhase === 'discussion' && !hasSubmitted;

    return (
        <GestureHandlerRootView style={{ flex: 1, width: '100%', alignItems: 'center' }}>
            <View style={styles.container}>
                {/* Psychic Identity Indicator - Moved higher and made subtle */}
                <View style={styles.psychicHeader}>
                    <Ionicons name="eye-outline" size={14} color={Colors.candlelight} />
                    <Text style={styles.psychicText}>
                        PSYCHIC: {players.find(p => p.role === 'psychic')?.name.toUpperCase() || 'CHOOSING...'}
                    </Text>
                </View>

                {/* Labels */}
                <View style={styles.labelsRow}>
                    <Text style={[styles.spectrumLabelLeft, { color: SPECTRUM_LEFT }]}>{left}</Text>
                    <Text style={[styles.spectrumLabelRight, { color: SPECTRUM_RIGHT }]}>{right}</Text>
                </View>

                {/* Dial Track Area */}
                <View style={styles.dialContainer}>
                    {/* Floating Bubble for Guess/Target */}
                    {(isGuessing || (isPsychic && gamePhase === 'reveal')) && (
                        <Animated.View style={[styles.valueBubble, bubbleStyle]}>
                            <Text style={styles.valueText}>
                                {Math.round((isPsychic ? target! : guessValue) - 50) * 2 > 0 ? '+' : ''}
                                {Math.round((isPsychic ? target! : guessValue) - 50) * 2}
                            </Text>
                            <View style={styles.bubbleArrow} />
                        </Animated.View>
                    )}

                    {/* Result Avatar Pins (Only in Results) */}
                    {gamePhase === 'results' && players.filter(p => !p.role || p.role === 'guesser').map(p => {
                        if (!p.vote) return null;
                        const v = parseInt(p.vote);
                        const leftPos = valueToX(v);
                        return (
                            <View key={p.id} style={[styles.avatarPinContainer, { transform: [{ translateX: leftPos - 14 }] } as any]}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{p.name[0].toUpperCase()}</Text>
                                </View>
                                <View style={styles.avatarArrow} />
                            </View>
                        );
                    })}

                    <View style={styles.dialTrack}>
                        <LinearGradient
                            colors={[SPECTRUM_LEFT, Colors.parchment, SPECTRUM_RIGHT]}
                            start={{ x: 0, y: 0.5 }}
                            end={{ x: 1, y: 0.5 }}
                            style={[styles.trackGradient, { opacity: 0.3 }]}
                        />

                        {/* Target Marker */}
                        <Animated.View style={[styles.targetMarker, targetStyle]}>
                            <View style={styles.bullseye}>
                                <View style={styles.bullseyeInner} />
                            </View>
                        </Animated.View>

                        {/* Interactive Knob */}
                        {isGuessing && (
                            <GestureDetector gesture={pan}>
                                <Animated.View style={[styles.dialKnob, dialStyle]}>
                                    <View style={styles.dialLine} />
                                </Animated.View>
                            </GestureDetector>
                        )}

                        {/* Frozen Knob for others/submitted */}
                        {(!isGuessing && gamePhase !== 'results' && !isPsychic) && (
                            <Animated.View style={[styles.dialKnob, dialStyle, { opacity: 0.6 }]}>
                                <View style={styles.dialLine} />
                            </Animated.View>
                        )}
                    </View>

                    {/* Scale Markers - Synced with TRACK_MARGIN */}
                    <View style={styles.scaleContainer}>
                        <View style={[styles.scaleMarkerWrapper, { left: 0, transform: [{ translateX: TRACK_MARGIN }] }]}>
                            <Text style={styles.scaleText}>-100</Text>
                        </View>
                        <View style={[styles.scaleMarkerWrapper, { left: 0, transform: [{ translateX: DIAL_WIDTH / 2 }] }]}>
                            <Text style={styles.scaleText}>0</Text>
                        </View>
                        <View style={[styles.scaleMarkerWrapper, { left: 0, transform: [{ translateX: DIAL_WIDTH - TRACK_MARGIN }] }]}>
                            <Text style={styles.scaleText}>+100</Text>
                        </View>
                    </View>
                </View>

                {/* Controls Area */}
                <View style={styles.controlsArea}>
                    {isPsychic && gamePhase === 'reveal' && (
                        <View style={styles.inputCard}>
                            <Text style={styles.inputLabel}>Give a One Word Clue:</Text>
                            <TextInput
                                style={styles.input}
                                value={clueText}
                                onChangeText={setClueText}
                                placeholder="e.g. Coffee"
                                placeholderTextColor={Colors.grayLight}
                                autoCorrect={false}
                                maxLength={20}
                            />
                            <Button
                                title="Submit Clue"
                                onPress={handleClueSubmit}
                                variant="primary"
                                disabled={!clueText.trim()}
                                style={{ marginTop: 24, width: '100%' }}
                            />
                        </View>
                    )}

                    {gamePhase === 'discussion' && (
                        <View style={styles.guessCard}>
                            <Text style={styles.clueLabel}>Psychic's Clue:</Text>
                            <Text style={styles.clueDisplay}>"{clue || '...'}"</Text>

                            {isGuessing && (
                                <Button
                                    title="Lock In Guess"
                                    onPress={handleGuessSubmit}
                                    variant="primary"
                                    style={{ marginTop: 30, width: '100%' }}
                                />
                            )}
                            {hasSubmitted && !isPsychic && (
                                <Text style={styles.statusText}>Guess Locked In!</Text>
                            )}
                            {isPsychic && (
                                <View style={{ width: '100%', alignItems: 'center' }}>
                                    <Text style={styles.statusText}>Watching the guessers...</Text>
                                    <Text style={styles.subStatusText}>
                                        ({players.filter(p => p.role === 'guesser' && p.vote).length} / {players.filter(p => p.role === 'guesser').length} Guessed)
                                    </Text>
                                    {isHost && (
                                        <Button
                                            title="Confirm & Reveal"
                                            onPress={handleReveal}
                                            variant="primary"
                                            style={{ marginTop: 20, width: '100%' }}
                                            icon={<Ionicons name="eye" size={20} color={Colors.victorianBlack} />}
                                        />
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {gamePhase === 'results' && (
                        <View style={styles.guessCard}>
                            <Text style={styles.clueLabel}>Psychic's Clue:</Text>
                            <Text style={styles.clueDisplay}>"{clue || '...'}"</Text>
                            <Text style={styles.statusText}>Target was {Math.round((target! - 50) * 2)}%</Text>
                        </View>
                    )}

                    {!isPsychic && gamePhase === 'reveal' && (
                        <View style={styles.guessCard}>
                            <Ionicons name="chatbubble-ellipses-outline" size={48} color={Colors.grayLight} style={{ opacity: 0.5, marginBottom: 10 }} />
                            <Text style={styles.statusText}>
                                Waiting for {players.find(p => p.role === 'psychic')?.name || 'the Psychic'} to give a clue...
                            </Text>
                        </View>
                    )}

                    {isPsychic && gamePhase === 'reveal' && (
                        <Text style={styles.instructions}>Target: {Math.round((target! - 50) * 2)}% on the spectrum</Text>
                    )}
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { width: '100%', alignItems: 'center' },
    psychicHeader: {
        marginBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    psychicText: {
        color: Colors.candlelight,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
    },
    labelsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        width: DIAL_WIDTH
    },
    spectrumLabelLeft: { fontSize: 18, fontWeight: 'bold', width: '45%' },
    spectrumLabelRight: { fontSize: 18, fontWeight: 'bold', textAlign: 'right', width: '45%' },

    dialContainer: {
        width: DIAL_WIDTH,
        position: 'relative',
        marginTop: 40,
        marginBottom: 40
    },
    dialTrack: {
        height: 80,
        backgroundColor: '#111',
        borderRadius: 40,
        position: 'relative',
        overflow: 'visible',
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        justifyContent: 'center',
        alignItems: 'flex-start', // Ensure children don't shift based on content
    },
    trackGradient: {
        position: 'absolute',
        top: 20,
        bottom: 20,
        left: 0,
        right: 0,
        borderRadius: 20,
    },
    targetMarker: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 40, // Match bullseye width
        height: 80,
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
        borderWidth: 3,
        borderColor: Colors.victorianBlack,
        shadowColor: Colors.suspect,
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    bullseyeInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.parchment
    },
    dialKnob: {
        position: 'absolute',
        left: 0,
        width: 36,
        height: 90,
        backgroundColor: Colors.parchment,
        borderRadius: 18,
        borderWidth: 4,
        borderColor: Colors.victorianBlack,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        shadowColor: 'black',
        shadowOpacity: 0.4,
        shadowRadius: 5,
    },
    dialLine: { width: 3, height: '60%', backgroundColor: Colors.victorianBlack, borderRadius: 1.5 },

    valueBubble: {
        position: 'absolute',
        left: 0,
        top: -65,
        backgroundColor: Colors.parchment,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 12,
        width: 60,
        alignItems: 'center',
        zIndex: 100, // Higher z-index for web
        shadowColor: 'black',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5, // Android support
    },
    valueText: { fontWeight: '900', color: Colors.victorianBlack, fontSize: 14 },
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
        borderTopColor: Colors.parchment,
    },

    scaleContainer: {
        marginTop: 15,
        height: 20,
        width: DIAL_WIDTH,
        position: 'relative',
    },
    scaleMarkerWrapper: {
        position: 'absolute',
        top: 0,
        width: 60,
        marginLeft: -30, // Center the 60px wide wrapper on the anchor point
        alignItems: 'center',
    },
    scaleText: {
        color: Colors.grayLight,
        fontSize: 12,
        fontWeight: '900',
        textAlign: 'center',
        width: '100%'
    },

    avatarPinContainer: {
        position: 'absolute',
        left: 0,
        top: -55,
        width: 28,
        alignItems: 'center',
        zIndex: 15,
    },
    avatarCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: Colors.parchment,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.victorianBlack
    },
    avatarText: { fontSize: 12, fontWeight: '900', color: Colors.victorianBlack },
    avatarArrow: {
        marginTop: -1,
        width: 0,
        height: 0,
        borderLeftWidth: 4,
        borderRightWidth: 4,
        borderTopWidth: 6,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: Colors.victorianBlack,
    },

    controlsArea: { width: '100%', alignItems: 'center' },
    inputCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 24,
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        shadowColor: Colors.parchment,
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    inputLabel: {
        fontSize: 16,
        color: Colors.parchment,
        marginBottom: 16,
        fontWeight: '700',
        letterSpacing: 1
    },
    input: {
        width: '100%',
        height: 56,
        backgroundColor: '#000',
        borderRadius: 28,
        paddingHorizontal: 20,
        color: Colors.parchment,
        fontSize: 18,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: Colors.grayLight,
    },
    guessCard: { width: '100%', alignItems: 'center' },
    clueLabel: { fontSize: 12, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 },
    clueDisplay: { fontSize: 32, color: Colors.parchment, fontWeight: '900', textAlign: 'center' },
    statusText: { marginTop: 20, color: Colors.candlelight, fontStyle: 'italic', fontSize: 16 },
    subStatusText: { color: Colors.grayLight, fontSize: 12, marginTop: 4, marginBottom: 10 },
    instructions: { marginTop: 20, color: Colors.grayLight, fontSize: 14, fontStyle: 'italic' }
});
