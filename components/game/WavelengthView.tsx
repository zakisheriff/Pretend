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
const DIAL_WIDTH = SCREEN_WIDTH - 80;
const SPECTRUM_LEFT = Colors.detective;
const SPECTRUM_RIGHT = Colors.gaslightAmber;

interface WavelengthViewProps {
    players: Player[];
    myPlayerId: string;
    roomCode: string;
    gamePhase: string;
}

export function WavelengthView({ players, myPlayerId, roomCode, gamePhase }: WavelengthViewProps) {
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
            if (newX < 0) newX = 0;
            if (newX > DIAL_WIDTH) newX = DIAL_WIDTH;
            dialX.value = newX;
            runOnJS(setGuessValue)((newX / DIAL_WIDTH) * 100);
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
        await GameAPI.castVote(myPlayerId, Math.round(guessValue).toString());
    };

    // Animated Styles
    const dialStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dialX.value - 15 }]
    }));

    const bubbleStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: dialX.value - 20 }]
    }));

    const targetVisibility = useSharedValue(0);
    useEffect(() => {
        targetVisibility.value = withTiming((isPsychic || gamePhase === 'results') ? 1 : 0);
    }, [isPsychic, gamePhase]);

    const targetStyle = useAnimatedStyle(() => ({
        left: `${target || 50}%`,
        opacity: targetVisibility.value
    }));

    const isGuessing = !isPsychic && gamePhase === 'discussion' && !hasSubmitted;

    return (
        <GestureHandlerRootView style={{ flex: 1, width: '100%', alignItems: 'center' }}>
            <View style={styles.container}>
                {/* Psychic Identity Indicator */}
                <View style={styles.psychicHeader}>
                    <Text style={styles.psychicText}>
                        <Ionicons name="eye-outline" size={14} color={Colors.candlelight} /> PSYCHIC: {players.find(p => p.role === 'psychic')?.name || 'Choosing...'}
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
                        return (
                            <View key={p.id} style={[styles.avatarPinContainer, { left: `${p.vote}%` } as any]}>
                                <View style={styles.avatarCircle}>
                                    <Text style={styles.avatarText}>{p.name[0]}</Text>
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

                    {/* Scale Markers */}
                    <View style={styles.scaleContainer}>
                        <Text style={[styles.scaleText, { position: 'absolute', left: -17.5 }]}>-100</Text>
                        <Text style={[styles.scaleText, { position: 'absolute', left: '50%', marginLeft: -17.5 }]}>0</Text>
                        <Text style={[styles.scaleText, { position: 'absolute', right: -17.5 }]}>+100</Text>
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
                                placeholderTextColor={Colors.gray}
                                autoCorrect={false}
                                maxLength={20}
                            />
                            <Button
                                title="Submit Clue"
                                onPress={handleClueSubmit}
                                variant="primary"
                                disabled={!clueText.trim()}
                                style={{ marginTop: 20, width: 200 }}
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
                                <Text style={styles.statusText}>Watching the guessers...</Text>
                            )}
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
        marginBottom: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)'
    },
    psychicText: {
        color: Colors.candlelight,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase'
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
        height: 70,
        backgroundColor: Colors.grayDark,
        borderRadius: 35,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        justifyContent: 'center'
    },
    trackGradient: {
        ...StyleSheet.absoluteFillObject,
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
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.suspect,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: Colors.victorianBlack
    },
    bullseyeInner: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.parchment
    },
    dialKnob: {
        position: 'absolute',
        width: 30,
        top: -5,
        bottom: -5,
        backgroundColor: Colors.parchment,
        borderRadius: 15,
        borderWidth: 3,
        borderColor: Colors.victorianBlack,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10
    },
    dialLine: { width: 2, height: '100%', backgroundColor: Colors.victorianBlack },

    valueBubble: {
        position: 'absolute',
        top: -45,
        backgroundColor: Colors.parchment,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        minWidth: 40,
        alignItems: 'center',
        zIndex: 20,
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
        marginTop: 10,
        height: 20,
        width: '100%',
        position: 'relative'
    },
    scaleText: { color: Colors.grayLight, fontSize: 10, fontWeight: 'bold', width: 35, textAlign: 'center' },

    avatarPinContainer: {
        position: 'absolute',
        top: -45,
        width: 0,
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
        backgroundColor: Colors.grayDark,
        padding: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.grayMedium
    },
    inputLabel: { fontSize: 16, color: Colors.parchment, marginBottom: 12 },
    input: {
        width: '100%',
        height: 50,
        backgroundColor: Colors.victorianBlack,
        borderRadius: 25,
        paddingHorizontal: 16,
        color: Colors.parchment,
        fontSize: 18,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: Colors.gray
    },
    guessCard: { width: '100%', alignItems: 'center' },
    clueLabel: { fontSize: 12, color: Colors.grayLight, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 5 },
    clueDisplay: { fontSize: 32, color: Colors.parchment, fontWeight: '900', textAlign: 'center' },
    statusText: { marginTop: 20, color: Colors.candlelight, fontStyle: 'italic', fontSize: 16 },
    instructions: { marginTop: 20, color: Colors.grayLight, fontSize: 14, fontStyle: 'italic' }
});
