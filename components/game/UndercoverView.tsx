import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button } from './Button';

interface UndercoverViewProps {
    players: Player[];
    myPlayerId: string;
    roomCode: string;
    gamePhase: string;
    isHost: boolean;
    gameData?: any;
}

export function UndercoverView({ players, myPlayerId, roomCode, gamePhase, isHost, gameData }: UndercoverViewProps) {
    const myPlayer = players.find(p => p.id === myPlayerId);
    const [revealed, setRevealed] = useState(false);
    const [loading, setLoading] = useState(false);

    const isUndercover = myPlayer?.role === 'undercover';
    const myWord = myPlayer?.secretWord || '???';

    const handleReveal = () => {
        haptics.heavy();
        setRevealed(true);
    };

    const handleStartDiscussion = async () => {
        setLoading(true);
        haptics.success();
        try {
            await GameAPI.updateGamePhase(roomCode, 'discussion');
        } finally {
            setLoading(false);
        }
    };

    const handleStartVoting = async () => {
        setLoading(true);
        haptics.success();
        try {
            await GameAPI.updateGamePhase(roomCode, 'voting');
        } finally {
            setLoading(false);
        }
    };

    // Reveal Phase - Cards to tap
    if (gamePhase === 'reveal') {
        return (
            <View style={styles.container}>
                <Animated.View entering={FadeIn} style={styles.header}>
                    <Ionicons name="finger-print" size={24} color={Colors.candlelight} />
                    <Text style={styles.headerTitle}>TAP TO REVEAL YOUR WORD</Text>
                </Animated.View>

                <Animated.View entering={ZoomIn.delay(200)} style={styles.cardContainer}>
                    {!revealed ? (
                        <TouchableOpacity
                            style={styles.hiddenCard}
                            onPress={handleReveal}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="eye-off" size={48} color={Colors.grayLight} />
                            <Text style={styles.tapText}>Tap to reveal</Text>
                        </TouchableOpacity>
                    ) : (
                        <Animated.View entering={ZoomIn} style={[styles.revealedCard, isUndercover && styles.undercoverCard]}>
                            {isUndercover && (
                                <View style={styles.roleBadge}>
                                    <Ionicons name="alert-circle" size={14} color={Colors.suspect} />
                                    <Text style={styles.roleBadgeText}>UNDERCOVER</Text>
                                </View>
                            )}
                            <Text style={styles.wordLabel}>Your Word:</Text>
                            <Text style={styles.wordText}>{myWord}</Text>
                            <Text style={styles.hintText}>
                                {isUndercover
                                    ? "You have a DIFFERENT word. Blend in!"
                                    : "Describe your word. Find the odd one out!"}
                            </Text>
                        </Animated.View>
                    )}
                </Animated.View>

                {/* Host: Start Discussion */}
                {isHost && revealed && (
                    <Button
                        title="Start Discussion"
                        onPress={handleStartDiscussion}
                        variant="primary"
                        loading={loading}
                        icon={<Ionicons name="chatbubbles" size={20} color={Colors.victorianBlack} />}
                        style={{ marginTop: 24 }}
                    />
                )}

                {/* Info for non-host */}
                {!isHost && revealed && (
                    <Animated.View entering={FadeInDown.delay(300)} style={styles.waitingInfo}>
                        <Ionicons name="time" size={16} color={Colors.grayLight} />
                        <Text style={styles.waitingInfoText}>Waiting for host to start discussion...</Text>
                    </Animated.View>
                )}
            </View>
        );
    }

    // Discussion Phase
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="chatbubbles" size={20} color={Colors.parchment} />
                <Text style={styles.headerTitle}>DISCUSSION</Text>
            </View>

            <View style={[styles.yourWordCard, isUndercover && styles.undercoverCard]}>
                <Text style={styles.yourWordLabel}>Your Word:</Text>
                <Text style={styles.yourWordText}>{myWord}</Text>
                {isUndercover && (
                    <Text style={styles.secretHint}>Blend in! Don't reveal you're different.</Text>
                )}
            </View>

            <View style={styles.instructionsCard}>
                <Ionicons name="information-circle" size={20} color={Colors.candlelight} />
                <Text style={styles.instructionsText}>
                    Describe your word without saying it directly.
                    Vote for the person you think has a different word!
                </Text>
            </View>

            {/* Theme info if available */}
            {gameData?.data?.themeName && (
                <View style={styles.themeInfo}>
                    <Text style={styles.themeLabel}>Theme:</Text>
                    <Text style={styles.themeText}>{gameData.data.themeName}</Text>
                </View>
            )}

            {/* Host: Start Voting */}
            {isHost && (
                <Button
                    title="Start Voting"
                    onPress={handleStartVoting}
                    variant="primary"
                    loading={loading}
                    icon={<Ionicons name="finger-print" size={20} color={Colors.victorianBlack} />}
                    style={{ marginTop: 24 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 30,
    },
    headerTitle: {
        fontSize: 16,
        color: Colors.candlelight,
        fontWeight: '800',
        letterSpacing: 2,
    },
    cardContainer: {
        width: '100%',
        alignItems: 'center',
    },
    hiddenCard: {
        width: '100%',
        aspectRatio: 1.5,
        maxHeight: 250,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderStyle: 'dashed',
    },
    tapText: {
        marginTop: 12,
        fontSize: 14,
        color: Colors.grayLight,
        fontWeight: '600',
    },
    revealedCard: {
        width: '100%',
        padding: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.candlelight,
    },
    undercoverCard: {
        borderColor: Colors.suspect,
        backgroundColor: 'rgba(255, 100, 100, 0.1)',
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255, 100, 100, 0.2)',
        borderRadius: 12,
        marginBottom: 16,
    },
    roleBadgeText: {
        fontSize: 11,
        color: Colors.suspect,
        fontWeight: '800',
        letterSpacing: 1,
    },
    wordLabel: {
        fontSize: 12,
        color: Colors.grayLight,
        fontWeight: '600',
        marginBottom: 8,
    },
    wordText: {
        fontSize: 36,
        color: Colors.parchment,
        fontWeight: '900',
        textAlign: 'center',
    },
    hintText: {
        marginTop: 20,
        fontSize: 14,
        color: Colors.grayLight,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    waitingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
    },
    waitingInfoText: {
        fontSize: 13,
        color: Colors.grayLight,
    },
    yourWordCard: {
        width: '100%',
        padding: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.candlelight,
        marginBottom: 20,
    },
    yourWordLabel: {
        fontSize: 11,
        color: Colors.grayLight,
        fontWeight: '600',
    },
    yourWordText: {
        fontSize: 28,
        color: Colors.parchment,
        fontWeight: '900',
        marginTop: 8,
    },
    secretHint: {
        marginTop: 12,
        fontSize: 12,
        color: Colors.suspect,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    instructionsCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        width: '100%',
    },
    instructionsText: {
        flex: 1,
        fontSize: 14,
        color: Colors.parchment,
        lineHeight: 20,
    },
    themeInfo: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    themeLabel: {
        fontSize: 12,
        color: Colors.grayLight,
    },
    themeText: {
        fontSize: 14,
        color: Colors.candlelight,
        fontWeight: '600',
    },
});
