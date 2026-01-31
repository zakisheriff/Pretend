import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button } from './Button';

interface ImposterViewProps {
    players: Player[];
    myPlayerId: string;
    roomCode: string;
    gamePhase: string;
    isHost: boolean;
    gameData?: any;
}

export function ImposterView({ players, myPlayerId, roomCode, gamePhase, isHost, gameData }: ImposterViewProps) {
    const myPlayer = players.find(p => p.id === myPlayerId);
    const [revealed, setRevealed] = useState(false);
    const [loading, setLoading] = useState(false);

    const isImposter = myPlayer?.role === 'imposter';
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

    // Reveal Phase
    if (gamePhase === 'reveal') {
        return (
            <View style={styles.container}>
                <Animated.View entering={FadeIn} style={styles.header}>
                    <Ionicons name="finger-print" size={24} color={Colors.candlelight} />
                    <Text style={styles.headerTitle}>TAP TO REVEAL YOUR ROLE</Text>
                </Animated.View>

                <Animated.View entering={ZoomIn.delay(200)} style={styles.cardContainer}>
                    {!revealed ? (
                        <TouchableOpacity
                            style={styles.hiddenCard}
                            onPress={handleReveal}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="help-circle" size={64} color={Colors.grayLight} />
                            <Text style={styles.tapText}>Tap to reveal</Text>
                        </TouchableOpacity>
                    ) : (
                        <Animated.View entering={ZoomIn} style={[styles.revealedCard, isImposter && styles.imposterCard]}>
                            {/* Role Badge */}
                            <View style={[styles.roleBadge, isImposter && styles.imposterBadge]}>
                                <Ionicons
                                    name={isImposter ? 'skull' : 'people'}
                                    size={16}
                                    color={isImposter ? Colors.suspect : Colors.candlelight}
                                />
                                <Text style={[styles.roleBadgeText, isImposter && styles.imposterBadgeText]}>
                                    {isImposter ? 'IMPOSTER' : 'CREWMATE'}
                                </Text>
                            </View>

                            {/* Word/Hint Display */}
                            <Text style={styles.wordLabel}>
                                {isImposter ? 'Your Hint:' : 'The Word:'}
                            </Text>
                            <Text style={[styles.wordText, isImposter && styles.imposterWordText]}>
                                {myWord}
                            </Text>

                            {/* Instructions */}
                            <Text style={styles.hintText}>
                                {isImposter
                                    ? "You only get a hint! Bluff to fit in."
                                    : "Describe the word. Find the imposter!"}
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

            <View style={[styles.yourWordCard, isImposter && styles.imposterCard]}>
                <View style={[styles.roleTag, isImposter && styles.imposterTag]}>
                    <Text style={[styles.roleTagText, isImposter && styles.imposterTagText]}>
                        {isImposter ? 'IMPOSTER' : 'CREWMATE'}
                    </Text>
                </View>
                <Text style={styles.yourWordLabel}>
                    {isImposter ? 'Your Hint:' : 'The Word:'}
                </Text>
                <Text style={[styles.yourWordText, isImposter && styles.imposterWordText]}>
                    {myWord}
                </Text>
            </View>

            <View style={styles.instructionsCard}>
                <Ionicons name="information-circle" size={20} color={Colors.candlelight} />
                <Text style={styles.instructionsText}>
                    {isImposter
                        ? "Listen carefully and try to blend in. Your clue is vague - be creative!"
                        : "Describe the word without saying it. Find who doesn't know the actual word!"}
                </Text>
            </View>
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
    imposterCard: {
        borderColor: Colors.suspect,
        backgroundColor: 'rgba(255, 80, 80, 0.1)',
    },
    roleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderRadius: 12,
        marginBottom: 20,
    },
    imposterBadge: {
        backgroundColor: 'rgba(255, 80, 80, 0.25)',
    },
    roleBadgeText: {
        fontSize: 12,
        color: Colors.candlelight,
        fontWeight: '800',
        letterSpacing: 2,
    },
    imposterBadgeText: {
        color: Colors.suspect,
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
    imposterWordText: {
        fontSize: 24,
        fontStyle: 'italic',
    },
    hintText: {
        marginTop: 24,
        fontSize: 14,
        color: Colors.grayLight,
        textAlign: 'center',
        fontStyle: 'italic',
        paddingHorizontal: 20,
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
    roleTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderRadius: 8,
        marginBottom: 12,
    },
    imposterTag: {
        backgroundColor: 'rgba(255, 80, 80, 0.2)',
    },
    roleTagText: {
        fontSize: 10,
        color: Colors.candlelight,
        fontWeight: '800',
        letterSpacing: 1,
    },
    imposterTagText: {
        color: Colors.suspect,
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
});
