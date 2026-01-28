import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, TextInput, View } from 'react-native';
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
                target: d.target,
                clue: d.clue || null
            };
        } catch (e) {
            return { left: 'Left', right: 'Right', target: 50, clue: null };
        }
    }, [myPlayer?.secretWord]);

    const { left, right, target, clue } = data;

    // Use standard Animated.Value
    const dialX = useRef(new Animated.Value(0.5 * DIAL_WIDTH)).current;

    // We need a ref to track the current value for PanResponder calculations without state re-renders
    const currentX = useRef(0.5 * DIAL_WIDTH);

    // Listen to animated value to update ref
    useEffect(() => {
        const id = dialX.addListener(({ value }) => {
            currentX.current = value;
        });
        return () => dialX.removeListener(id);
    }, []);

    const [guessValue, setGuessValue] = useState(50);
    const [clueText, setClueText] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    // Sync Dial with existing vote if present
    useEffect(() => {
        if (myPlayer?.vote) {
            const v = parseInt(myPlayer.vote);
            if (!isNaN(v)) {
                setGuessValue(v);
                const newX = valueToX(v);
                dialX.setValue(newX);
                currentX.current = newX;
                setHasSubmitted(true);
            }
        } else if (!hasSubmitted) {
            // Reset to center if new round or not submitted
            const centerX = valueToX(50);
            dialX.setValue(centerX);
            currentX.current = centerX;
            setGuessValue(50);
        }
    }, [myPlayer?.vote, hasSubmitted]);

    const isGuessing = !isPsychic && gamePhase === 'discussion' && !hasSubmitted;

    // PanResponder for safe, native-driven gestures without Reanimated/GestureHandler
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => isGuessing,
            onMoveShouldSetPanResponder: () => isGuessing,
            onPanResponderGrant: () => {
                // Optional: visual feedback
            },
            onPanResponderMove: (_, gestureState) => {
                let newX = currentX.current + gestureState.dx; // dx is accumulated distance? No, need to offset
                // Correction: we should add dx to the START position.
                // But currentX tracks the animated value which we update.
                // Better approach: Set value directly based on offset.

                // Let's rely on the value at start of gesture
            },
            onPanResponderRelease: () => {
                haptics.selection();
            }
        })
    ).current;

    // We need state to track start position for PanResponder
    const startX = useRef(0);

    // Re-create PanResponder to capture correct closure if needed, or use mutable refs
    // Ideally PanResponder is stable.

    // Actually, 'isGuessing' changes, so let's update proper logic.
    const panHandlers = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => !isPsychic && gamePhase === 'discussion' && !hasSubmitted,
        onMoveShouldSetPanResponder: () => !isPsychic && gamePhase === 'discussion' && !hasSubmitted,
        onPanResponderGrant: () => {
            startX.current = currentX.current;
        },
        onPanResponderMove: (_, gestureState) => {
            let newX = startX.current + gestureState.dx;

            // Constrain
            if (newX < TRACK_MARGIN) newX = TRACK_MARGIN;
            if (newX > DIAL_WIDTH - TRACK_MARGIN) newX = DIAL_WIDTH - TRACK_MARGIN;

            dialX.setValue(newX);

            // Calculate percentage for display (optional: throttle this if performance issues arise)
            const percentage = ((newX - TRACK_MARGIN) / (DIAL_WIDTH - 2 * TRACK_MARGIN)) * 100;
            // Only update state if needed to avoid spam, or just wait for release?
            // User requested smoothness. Let's try updating state but maybe throttled?
            // For now, let's update "visual" via Animated (done above) and "value" via state
            setGuessValue(percentage);
        },
        onPanResponderRelease: (_, gestureState) => {
            let newX = startX.current + gestureState.dx;
            if (newX < TRACK_MARGIN) newX = TRACK_MARGIN;
            if (newX > DIAL_WIDTH - TRACK_MARGIN) newX = DIAL_WIDTH - TRACK_MARGIN;

            currentX.current = newX; // Update ref for next gesture

            const percentage = ((newX - TRACK_MARGIN) / (DIAL_WIDTH - 2 * TRACK_MARGIN)) * 100;
            setGuessValue(percentage);
            haptics.selection();
        }
    }), [isPsychic, gamePhase, hasSubmitted]).panHandlers;


    const handleClueSubmit = async () => {
        if (!clueText.trim()) return;
        setLoading(true);
        haptics.heavy();
        try {
            await GameAPI.setWavelengthClue(roomCode, clueText.trim());
        } finally {
            setLoading(false);
        }
    };

    const handleGuessSubmit = async () => {
        setLoading(true);
        haptics.heavy();
        try {
            setHasSubmitted(true);
            await GameAPI.castVote(myPlayerId, Math.round(guessValue).toString());
        } finally {
            setLoading(false);
        }
    };

    const handleReveal = async () => {
        setLoading(true);
        haptics.success();
        try {
            await GameAPI.revealWavelength(roomCode);
        } finally {
            setLoading(false);
        }
    };

    // Interpolations / Styles
    const dialTranslateX = dialX; // Direct Animated.Value

    // Bubble position
    // If psychic, show target value. If guesser, show dial value.
    const bubbleTranslateX = isPsychic
        ? valueToX(target !== undefined ? target : 50)
        : dialX;


    // Target visibility
    const targetOpacity = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(targetOpacity, {
            toValue: (isPsychic || gamePhase === 'results') ? 1 : 0,
            duration: 300,
            useNativeDriver: true
        }).start();
    }, [isPsychic, gamePhase]);

    return (
        <View style={{ flex: 1, width: '100%', alignItems: 'center' }}>
            <View style={styles.container}>
                {/* Psychic Identity Indicator */}
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
                    {/* Floating Bubble */}
                    {(isGuessing || (isPsychic && gamePhase === 'reveal')) && (
                        <Animated.View style={[
                            styles.valueBubble,
                            { transform: [{ translateX: Animated.subtract(isPsychic ? valueToX(target !== undefined ? target : 50) : dialTranslateX, BUBBLE_WIDTH / 2) }] }
                        ]}>
                            <Text style={styles.valueText}>
                                {Math.round((isPsychic ? target! : guessValue) - 50) * 2 > 0 ? '+' : ''}
                                {Math.round((isPsychic ? target! : guessValue) - 50) * 2}
                            </Text>
                            <View style={styles.bubbleArrow} />
                        </Animated.View>
                    )}

                    {/* Result Avatar Pins */}
                    {gamePhase === 'results' && players.filter(p => !p.role || p.role === 'guesser').map(p => {
                        if (!p.vote) return null;
                        const v = parseInt(p.vote);
                        const leftPos = valueToX(v);
                        return (
                            <View key={p.id} style={[styles.avatarPinContainer, { transform: [{ translateX: leftPos - 14 }] }]}>
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
                        <Animated.View style={[styles.targetMarker, {
                            opacity: targetOpacity,
                            transform: [{ translateX: valueToX(target !== undefined ? target : 50) - TARGET_WIDTH / 2 }] // Standard View transform, no translateX offset needed if absolute? Wait.
                            // Left is 0. Transform translateX shifts it.
                            // valueToX returns absolute X relative to container Left=0.
                        }]}>
                            <View style={styles.bullseye}>
                                <View style={styles.bullseyeInner} />
                            </View>
                        </Animated.View>

                        {/* Interactive Knob */}
                        {isGuessing && (
                            <Animated.View
                                {...panHandlers}
                                style={[styles.dialKnob, { transform: [{ translateX: Animated.subtract(dialTranslateX, KNOB_WIDTH / 2) }] }]}
                            >
                                <View style={styles.dialLine} />
                            </Animated.View>
                        )}

                        {/* Frozen Knob */}
                        {(!isGuessing && gamePhase !== 'results' && !isPsychic) && (
                            <Animated.View style={[styles.dialKnob, {
                                opacity: 0.6,
                                transform: [{ translateX: Animated.subtract(dialTranslateX, KNOB_WIDTH / 2) }]
                            }]}>
                                <View style={styles.dialLine} />
                            </Animated.View>
                        )}
                    </View>

                    {/* Scale Markers */}
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
                                loading={loading}
                                disabled={!clueText.trim() || loading}
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
                                    loading={loading}
                                    disabled={loading}
                                    style={{ marginTop: 30, width: '100%' }}
                                />
                            )}
                            {hasSubmitted && !isPsychic && (
                                <Text style={styles.statusText}>Guess Locked In!</Text>
                            )}
                            {isPsychic && (
                                <View style={{ width: '100%', alignItems: 'center' }}>
                                    <View style={styles.guessersList}>
                                        {players.filter(p => p.role === 'guesser').map(p => (
                                            <View key={p.id} style={styles.guesserRow}>
                                                <Ionicons
                                                    name={p.vote ? "checkmark-circle" : "ellipse-outline"}
                                                    size={22}
                                                    color={p.vote ? "#4ADE80" : "#666"}
                                                />
                                                <Text style={[styles.guesserName, p.vote && { color: Colors.parchment, fontWeight: '700' }]}>
                                                    {p.name}
                                                </Text>
                                                {/* {!p.vote && <Text style={{fontSize: 10, color: Colors.grayOnly}}>Thinking...</Text>} */}
                                            </View>
                                        ))}
                                    </View>
                                    <Text style={styles.subStatusText}>
                                        {players.filter(p => p.role === 'guesser' && p.vote).length} / {players.filter(p => p.role === 'guesser').length} Guessed
                                    </Text>
                                </View>
                            )}

                            {isHost && (
                                <Button
                                    title="Confirm & Reveal"
                                    onPress={handleReveal}
                                    variant="primary"
                                    loading={loading}
                                    disabled={loading}
                                    style={{ marginTop: 20, width: '100%' }}
                                    icon={<Ionicons name="eye" size={20} color={Colors.victorianBlack} />}
                                />
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

                    {myPlayer?.role === 'spectator' && (
                        <View style={styles.spectatorBanner}>
                            <Ionicons name="eye" size={16} color={Colors.candlelight} />
                            <Text style={styles.spectatorBannerText}>
                                YOU ARE A SPECTATOR • ENJOY THE SHOW
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
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
        position: 'relative', // Context for absolute children
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
        alignItems: 'flex-start', // Important for translateX
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
    instructions: { marginTop: 20, color: Colors.grayLight, fontSize: 14, fontStyle: 'italic' },

    guessersList: {
        width: '100%',
        gap: 8,
        marginVertical: 15,
        paddingHorizontal: 20
    },
    guesserRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 10,
        borderRadius: 12,
    },
    guesserName: {
        color: Colors.grayLight,
        fontSize: 16,
        fontWeight: '600'
    },
    spectatorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginTop: 24,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    spectatorBannerText: {
        color: Colors.candlelight,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
        flexShrink: 1
    },
});
