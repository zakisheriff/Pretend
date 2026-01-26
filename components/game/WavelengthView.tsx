
import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Button } from './Button';

const DIAL_WIDTH = 300; // Fixed width for consistent UI
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

    // Parse Data
    const [data, setData] = useState<{ left: string, right: string, target: number | null }>({ left: 'Left', right: 'Right', target: 50 });

    useEffect(() => {
        if (myPlayer?.secretWord) {
            try {
                const d = JSON.parse(myPlayer.secretWord);
                setData({
                    left: d.left || 'Left',
                    right: d.right || 'Right',
                    target: d.target // null for guessers during reveal
                });
            } catch (e) { }
        }
    }, [myPlayer?.secretWord]);

    // Dial State
    const dialX = useSharedValue(0.5 * DIAL_WIDTH);
    const [guessValue, setGuessValue] = useState(50);
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
    }, []); // Run once on mount

    const pan = Gesture.Pan()
        .onChange((e) => {
            if (isPsychic || hasSubmitted || gamePhase === 'results') return;
            let newX = dialX.value + e.changeX;
            if (newX < 0) newX = 0;
            if (newX > DIAL_WIDTH) newX = DIAL_WIDTH;
            dialX.value = newX;
            runOnJS(setGuessValue)((newX / DIAL_WIDTH) * 100);
        });

    const handleSubmit = async () => {
        setHasSubmitted(true);
        await GameAPI.castVote(myPlayerId, Math.round(guessValue).toString());
    };

    const dialStyle = useAnimatedStyle(() => ({ transform: [{ translateX: dialX.value - 15 }] }));
    const targetStyle = useAnimatedStyle(() => ({ left: `${data.target || 50}%`, opacity: (isPsychic || gamePhase === 'results') ? 1 : 0 }));

    return (
        <GestureHandlerRootView style={{ flex: 1, width: '100%', alignItems: 'center' }}>
            <View style={styles.container}>
                {/* Labels */}
                <View style={styles.labelsRow}>
                    <Text style={[styles.label, { color: SPECTRUM_LEFT, textAlign: 'left' }]}>{data.left}</Text>
                    <Text style={[styles.label, { color: SPECTRUM_RIGHT, textAlign: 'right' }]}>{data.right}</Text>
                </View>

                {/* Dial Track */}
                <View style={styles.dialTrack}>
                    {/* Gradient Background (simulated with View for now) */}
                    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#333', opacity: 0.5 }} />

                    {/* Target Marker (Visible to Psychic or Everyone in Results) */}
                    <Animated.View style={[styles.targetMarker, targetStyle]}>
                        <View style={styles.bullseye}>
                            <View style={styles.bullseyeInner} />
                        </View>
                    </Animated.View>

                    {/* My Dial */}
                    {(!isPsychic || gamePhase === 'results') && (
                        <GestureDetector gesture={pan}>
                            <Animated.View style={[styles.dialKnob, dialStyle]}>
                                <View style={styles.dialLine} />
                            </Animated.View>
                        </GestureDetector>
                    )}

                    {/* Other Players Guesses (Only in Results) */}
                    {gamePhase === 'results' && players.filter(p => p.id !== myPlayerId && p.role !== 'psychic' && p.vote).map(p => (
                        <View key={p.id} style={[styles.avatarPin, { left: `${parseInt(p.vote!)}%` }]}>
                            <View style={styles.miniAvatar}><Text style={{ fontSize: 10 }}>{p.name[0]}</Text></View>
                        </View>
                    ))}
                </View>

                {/* Controls */}
                <View style={{ marginTop: 40, alignItems: 'center', gap: 10 }}>
                    {isPsychic ? (
                        <Text style={styles.roleText}>YOU ARE THE PSYCHIC</Text>
                    ) : (
                        <>
                            <Text style={styles.roleText}>{Math.round(guessValue)}%</Text>
                            {!hasSubmitted && gamePhase === 'discussion' && (
                                <Button title="Lock Guess" onPress={handleSubmit} variant="primary" />
                            )}
                        </>
                    )}
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: { width: '100%', padding: 20 },
    labelsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, width: DIAL_WIDTH },
    label: { fontSize: 18, fontWeight: 'bold', width: '45%' },
    dialTrack: {
        width: DIAL_WIDTH, height: 60, backgroundColor: '#222', borderRadius: 30,
        borderWidth: 2, borderColor: '#444', justifyContent: 'center', position: 'relative', overflow: 'hidden'
    },
    dialKnob: {
        position: 'absolute', width: 30, height: 60, backgroundColor: Colors.parchment, borderRadius: 15,
        borderWidth: 3, borderColor: '#000', alignItems: 'center', justifyContent: 'center'
    },
    dialLine: { width: 2, height: '100%', backgroundColor: '#000' },
    targetMarker: { position: 'absolute', width: 4, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
    bullseye: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.suspect, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#000' },
    bullseyeInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' },
    roleText: { color: Colors.parchment, fontSize: 18, fontWeight: 'bold' },
    avatarPin: { position: 'absolute', top: -10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
    miniAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.parchment, alignItems: 'center', justifyContent: 'center' }
});
