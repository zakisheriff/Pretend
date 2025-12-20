import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const PEEK_THRESHOLD = 80;

interface RoleRevealCardProps {
    playerName: string;
    isImposter: boolean;
    word: string | null;
    hint: string | null;
    hasRevealed: boolean;
    onReveal: () => void;
}

export const RoleRevealCard: React.FC<RoleRevealCardProps> = ({
    playerName,
    isImposter,
    word,
    hint,
    hasRevealed,
    onReveal,
}) => {
    const [peekAmount, setPeekAmount] = useState(0);
    const [hasPeeked, setHasPeeked] = useState(hasRevealed);

    // Animated values for smooth transitions
    const coverTranslateY = useSharedValue(hasRevealed ? -500 : 0);
    const coverOpacity = useSharedValue(hasRevealed ? 0 : 1);

    const panResponder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => !hasPeeked,
        onMoveShouldSetPanResponder: () => !hasPeeked,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy < 0) {
                const newPeek = Math.min(Math.abs(gestureState.dy), 300);
                setPeekAmount(newPeek);
                coverTranslateY.value = -newPeek;
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (Math.abs(gestureState.dy) > PEEK_THRESHOLD) {
                // Threshold passed - animate card flying up and away
                setHasPeeked(true);
                coverTranslateY.value = withSpring(-500, { damping: 15, stiffness: 100 });
                coverOpacity.value = withTiming(0, { duration: 300 });

                if (isImposter) {
                    haptics.imposterReveal();
                } else {
                    haptics.success();
                }
                onReveal();
            } else {
                // Threshold not passed - animate back to start
                setPeekAmount(0);
                coverTranslateY.value = withSpring(0, { damping: 15 });
            }
        },
    }), [hasPeeked, isImposter, onReveal]);

    const coverAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: coverTranslateY.value }],
        opacity: coverOpacity.value,
    }));

    // Get drag feedback message for the bottom card
    const getDragFeedback = () => {
        if (hasPeeked) return null;
        if (peekAmount === 0) return 'Drag the card above to reveal';
        if (peekAmount < PEEK_THRESHOLD * 0.5) return 'Keep going...';
        if (peekAmount < PEEK_THRESHOLD) return 'Almost there...';
        return 'Release to reveal!';
    };

    return (
        <View style={styles.container}>
            {/* Role content - Victorian case file underneath */}
            <View style={styles.revealCard}>
                <View style={styles.roleContainer}>
                    <Text style={styles.roleLabel}>YOUR IDENTITY</Text>
                    <View style={styles.roleRow}>
                        <Ionicons name={isImposter ? "skull" : "search"} size={24} color={isImposter ? Colors.suspect : Colors.detective} />
                        <Text style={[styles.roleText, isImposter ? styles.suspectText : styles.detectiveText]}>
                            {isImposter ? 'SUSPECT' : 'DETECTIVE'}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {(isImposter && !hint) ? (
                    <View style={[styles.infoContainer, { opacity: 0.5 }]}>
                        <Text style={styles.infoLabel}>YOUR CLUE</Text>
                        <Text style={[styles.hintText, { fontStyle: 'italic' }]}>No clue available</Text>
                    </View>
                ) : (
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>{isImposter ? 'YOUR CLUE' : 'SECRET EVIDENCE'}</Text>
                        <Text style={isImposter ? styles.hintText : styles.wordText}>
                            {isImposter ? hint : word}
                        </Text>
                    </View>
                )}

                {isImposter && (
                    <View style={styles.warningBox}>
                        <Ionicons name="skull-outline" size={16} color={Colors.suspect} />
                        <Text style={styles.warningText}>Deceive wisely. Avoid detection.</Text>
                    </View>
                )}

                {/* Drag feedback at BOTTOM of reveal card - visible while dragging */}
                {!hasPeeked && (
                    <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackText}>{getDragFeedback()}</Text>
                    </View>
                )}

                {hasPeeked && (
                    <View style={styles.seenBadge}>
                        <Ionicons name="document-text" size={14} color={Colors.detective} />
                        <Text style={styles.seenText}>Case file reviewed</Text>
                    </View>
                )}
            </View>

            {/* Cover card - Victorian envelope style with animation */}
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.coverCard,
                    coverAnimatedStyle,
                    { pointerEvents: hasPeeked ? 'none' : 'auto' }
                ]}
            >
                {/* Wax seal avatar */}
                <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{playerName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.playerName}>{playerName}</Text>

                <View style={styles.dragHint}>
                    <Ionicons name="chevron-up" size={20} color={Colors.candlelight} />
                    <Text style={styles.dragText}>UNSEAL YOUR IDENTITY</Text>
                    <Ionicons name="chevron-up" size={20} color={Colors.candlelight} />
                </View>

                <View style={styles.handle} />

                {/* Progress indicator */}
                {peekAmount > 0 && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(100, (peekAmount / PEEK_THRESHOLD) * 100)}%` }]} />
                    </View>
                )}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    revealCard: {
        position: 'absolute', top: 16, left: 16, right: 16, bottom: 16,
        backgroundColor: Colors.victorianBlack, borderRadius: 20, padding: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.gray,
    },
    feedbackContainer: {
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(196,167,108,0.15)',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: Colors.candlelight,
    },
    feedbackText: {
        fontSize: 16, color: Colors.candlelight, fontWeight: '600', letterSpacing: 1, textAlign: 'center',
    },
    coverCard: {
        position: 'absolute', top: 16, left: 16, right: 16, bottom: 16,
        backgroundColor: Colors.grayDark, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.candlelight,
    },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: Colors.waxSeal, alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, borderWidth: 3, borderColor: Colors.suspect,
    },
    avatarLetter: { fontSize: 32, fontWeight: '700', color: Colors.parchmentLight },
    playerName: { fontSize: 26, fontWeight: '700', color: Colors.parchment, marginBottom: 24, letterSpacing: 2 },
    dragHint: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        padding: 16, backgroundColor: Colors.victorianBlack, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.grayMedium,
    },
    dragText: { fontSize: 11, fontWeight: '700', color: Colors.candlelight, letterSpacing: 2 },
    handle: { position: 'absolute', bottom: 16, width: 40, height: 4, backgroundColor: Colors.grayMedium, borderRadius: 2 },
    progressContainer: {
        position: 'absolute', bottom: 28, left: 40, right: 40,
        height: 3, backgroundColor: Colors.gray, borderRadius: 2
    },
    progressBar: { height: '100%', backgroundColor: Colors.candlelight, borderRadius: 2 },
    roleContainer: { alignItems: 'center', marginBottom: 20 },
    roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    roleLabel: { fontSize: 11, fontWeight: '600', color: Colors.grayLight, letterSpacing: 4, marginBottom: 10 },
    roleText: { fontSize: 26, fontWeight: '800', letterSpacing: 3 },
    suspectText: { color: Colors.suspect },
    detectiveText: { color: Colors.detective },
    divider: { width: 80, height: 2, backgroundColor: Colors.candlelight, marginVertical: 20, opacity: 0.4 },
    infoContainer: { alignItems: 'center', marginBottom: 20 },
    infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.grayLight, letterSpacing: 4, marginBottom: 10 },
    hintText: { fontSize: 16, color: Colors.parchment, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 16 },
    wordText: { fontSize: 24, fontWeight: '700', color: Colors.parchment, textAlign: 'center', letterSpacing: 1 },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(160,32,32,0.15)', padding: 14, borderRadius: 12,
        borderWidth: 1.5, borderColor: Colors.suspect, marginTop: 8,
    },
    warningText: { fontSize: 13, color: Colors.suspect, fontWeight: '600', letterSpacing: 0.5 },
    seenBadge: {
        position: 'absolute', bottom: 20,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(196,167,108,0.15)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
        borderWidth: 1.5, borderColor: Colors.detective,
    },
    seenText: { fontSize: 11, color: Colors.detective, fontWeight: '600', letterSpacing: 0.5 },
});
