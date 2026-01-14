import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

const PEEK_THRESHOLD = 80;

interface RoleRevealCardProps {
    playerName: string;
    isImposter: boolean;
    word: string | null;
    hint: string | null;
    hasRevealed: boolean;
    onReveal: () => void;
    // Extended props for all modes
    movie?: string | null;
    genre?: string | null;
    movieHint?: string | null;
    isDirector?: boolean;
    question?: string | null;
    isOutlier?: boolean;
    isFirstPlayer?: boolean;
    onRefresh?: () => void;
    // Thief & Police specific
    isPolice?: boolean;
    isThief?: boolean;
}

export const RoleRevealCard: React.FC<RoleRevealCardProps> = ({
    playerName,
    isImposter,
    word,
    hint,
    hasRevealed,
    onReveal,
    movie,
    genre,
    movieHint,
    isDirector,
    question,
    isOutlier,
    isFirstPlayer = false,
    onRefresh,
    isPolice,
    isThief,
}) => {
    const [peekAmount, setPeekAmount] = useState(0);
    const [hasPeeked, setHasPeeked] = useState(hasRevealed);

    const gameMode = useGameStore((s) => s.gameMode);
    const getModeDisplayInfo = useGameStore((s) => s.getModeDisplayInfo);
    const refreshTheme = useGameStore((s) => s.refreshTheme);
    const { specialRoleName, specialRoleIcon, normalRoleName } = getModeDisplayInfo();

    // Can show refresh button if:
    // - First player AND not imposter AND already peeked AND not Director's Cut
    const canRefresh = isFirstPlayer && !isImposter && hasPeeked && gameMode !== 'directors-cut';

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

                haptics.success();
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

    // Get role display based on game mode
    const getRoleDisplay = () => {
        switch (gameMode) {
            case 'undercover-word':
                // Classic Imposter - Show role (imposter vs crewmate)
                return {
                    icon: isImposter ? 'skull' : 'search',
                    label: isImposter ? 'Imposter' : 'Crewmate',
                    color: isImposter ? Colors.suspect : Colors.detective,
                };
            case 'directors-cut':
                return {
                    icon: isDirector ? 'film' : 'eye',
                    label: isDirector ? 'Director' : 'Viewer',
                    color: isDirector ? Colors.gaslightAmber : Colors.detective,
                };
            case 'mind-sync':
                // Mind Sync - Don't reveal role! Everyone just sees their question
                return {
                    icon: 'person',
                    label: 'Player',
                    color: Colors.candlelight,
                    hideRole: true, // Flag to hide the role section entirely
                };
            case 'classic-imposter':
                // Undercover - Don't reveal role! Everyone sees the same label
                return {
                    icon: 'person',
                    label: 'Player',
                    color: Colors.candlelight,
                    hideRole: true, // Flag to hide the role section entirely
                };
            case 'thief-police':
                // Thief & Police - Show role (Police/Thief/Civilian)
                if (isPolice) {
                    return {
                        icon: 'shield-checkmark',
                        label: 'Police',
                        color: Colors.detective,
                    };
                }
                if (isThief) {
                    return {
                        icon: 'finger-print',
                        label: 'Thief',
                        color: Colors.suspect,
                    };
                }
                return {
                    icon: 'person',
                    label: 'Civilian',
                    color: Colors.candlelight,
                };
            default:
                return {
                    icon: isImposter ? 'skull' : 'search',
                    label: isImposter ? 'Suspect' : 'Detective',
                    color: isImposter ? Colors.suspect : Colors.detective,
                };
        }
    };

    // Get content display based on game mode
    const getContentDisplay = () => {
        switch (gameMode) {
            case 'undercover-word':
                // Classic Imposter - Imposter gets clue, crewmates get word
                if (isImposter) {
                    return {
                        label: 'Your Clue',
                        content: hint || 'No clue available',
                        isLarge: false,
                        warningText: 'Deceive wisely. Blend in with others!',
                    };
                }
                return {
                    label: 'Secret Evidence',
                    content: word,
                    isLarge: true,
                    warningText: null,
                };

            case 'directors-cut':
                if (isDirector) {
                    return {
                        label: 'The Movie',
                        content: movie,
                        isLarge: true,
                        sublabel: genre ? `Genre: ${genre}` : null,
                        warningText: 'Answer yes/no questions. Don\'t give it away!',
                    };
                }
                return {
                    label: 'Your Hint',
                    content: movieHint,
                    isLarge: false,
                    sublabel: genre ? `Genre: ${genre}` : null,
                    warningText: null,
                };

            case 'mind-sync':
                // Mind Sync - Just show the question, no role hints (role is hidden)
                return {
                    label: 'Your Question',
                    content: question,
                    isLarge: false,
                    warningText: 'Answer this question. Find who has a different one!',
                };

            case 'classic-imposter':
                // Undercover - Just show the word, no role hints (role is hidden)
                return {
                    label: 'Your Word',
                    content: word,
                    isLarge: true,
                    warningText: 'Describe your word. Find who has a different one!',
                };

            case 'thief-police':
                // Thief & Police - Show word and role-specific hint
                if (isPolice) {
                    return {
                        label: 'Your Word',
                        content: word,
                        isLarge: true,
                        warningText: 'You are the POLICE. Find the Thief!',
                    };
                }
                if (isThief) {
                    return {
                        label: 'Your Word',
                        content: word,
                        isLarge: true,
                        warningText: 'You are the THIEF. Blend in!',
                    };
                }
                return {
                    label: 'Your Word',
                    content: word,
                    isLarge: true,
                    warningText: 'You are a CIVILIAN. Help catch the Thief!',
                };

            default:
                return {
                    label: isImposter ? 'Your Clue' : 'Secret Evidence',
                    content: isImposter ? hint : word,
                    isLarge: !isImposter,
                    warningText: isImposter ? 'Deceive wisely. Avoid detection.' : null,
                };
        }
    };

    const roleDisplay = getRoleDisplay();
    const contentDisplay = getContentDisplay();

    return (
        <View style={styles.container}>
            {/* Role content - Victorian case file underneath */}
            <View style={styles.revealCard}>
                {/* Hide role section for Mind Sync and Undercover modes */}
                {gameMode !== 'classic-imposter' && gameMode !== 'mind-sync' && (
                    <>
                        <View style={styles.roleContainer}>
                            <Text style={styles.roleLabel}>Your Identity</Text>
                            <View style={styles.roleRow}>
                                <Ionicons name={roleDisplay.icon as any} size={24} color={roleDisplay.color} />
                                <Text style={[styles.roleText, { color: roleDisplay.color }]}>
                                    {roleDisplay.label}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                    </>
                )}

                {!contentDisplay.content ? (
                    <View style={[styles.infoContainer, { opacity: 0.5 }]}>
                        <Text style={styles.infoLabel}>{contentDisplay.label}</Text>
                        <Text style={[styles.hintText, { fontStyle: 'italic' }]}>No clue available</Text>
                    </View>
                ) : (
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>{contentDisplay.label}</Text>
                        <Text style={contentDisplay.isLarge ? styles.wordText : styles.hintText}>
                            {contentDisplay.content}
                        </Text>
                        {contentDisplay.sublabel && (
                            <Text style={styles.sublabelText}>{contentDisplay.sublabel}</Text>
                        )}
                    </View>
                )}

                {/* Warning box removed per user request for simplicity */}

                {/* Drag feedback at BOTTOM of reveal card - visible while dragging */}
                {!hasPeeked && (
                    <View style={styles.feedbackContainer}>
                        <Text style={styles.feedbackText}>{getDragFeedback()}</Text>
                    </View>
                )}

                {/* Case file reviewed badge removed per user request */}

                {/* Refresh button for first non-imposter player */}
                {canRefresh && onRefresh && (
                    <TouchableOpacity
                        style={styles.refreshBtn}
                        onPress={() => {
                            haptics.medium();
                            onRefresh();
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="refresh" size={16} color={Colors.parchment} />
                        <Text style={styles.refreshText}>Seen this before? Change word </Text>
                    </TouchableOpacity>
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
                    <Text style={styles.dragText}>Unseal Your Identity</Text>
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
        backgroundColor: Colors.victorianBlack, borderRadius: 28, padding: 24,
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
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: Colors.candlelight,
    },
    feedbackText: {
        fontSize: 16, color: Colors.candlelight, fontWeight: '600', letterSpacing: 1, textAlign: 'center',
    },
    coverCard: {
        position: 'absolute', top: 16, left: 16, right: 16, bottom: 16,
        backgroundColor: Colors.grayDark, borderRadius: 28,
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
        padding: 16, backgroundColor: Colors.victorianBlack, borderRadius: 20,
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
    divider: { width: 80, height: 2, backgroundColor: Colors.candlelight, marginVertical: 20, opacity: 0.4 },
    infoContainer: { alignItems: 'center', marginBottom: 20 },
    infoLabel: { fontSize: 11, fontWeight: '600', color: Colors.grayLight, letterSpacing: 4, marginBottom: 10 },
    hintText: { fontSize: 16, color: Colors.parchment, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 16, lineHeight: 24 },
    wordText: { fontSize: 24, fontWeight: '700', color: Colors.parchment, textAlign: 'center', letterSpacing: 1 },
    sublabelText: { fontSize: 12, color: Colors.candlelight, marginTop: 8, fontStyle: 'italic' },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgba(160,32,32,0.15)', padding: 14, borderRadius: 12,
        borderWidth: 1.5, borderColor: Colors.suspect, marginTop: 8,
    },
    infoBox: {
        backgroundColor: 'rgba(196,167,108,0.15)',
        borderColor: Colors.candlelight,
    },
    warningText: { fontSize: 13, color: Colors.suspect, fontWeight: '600', letterSpacing: 0.5, flex: 1 },
    infoText: { color: Colors.candlelight },
    seenBadge: {
        position: 'absolute', bottom: 20,
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(196,167,108,0.15)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 16,
        borderWidth: 1.5, borderColor: Colors.detective,
    },
    seenText: { fontSize: 11, color: Colors.detective, fontWeight: '600', letterSpacing: 0.5 },
    refreshBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: Colors.grayMedium,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        marginTop: 16,
        borderWidth: 1,
        borderColor: Colors.grayLight,
    },
    refreshText: { fontSize: 12, color: Colors.parchment, fontWeight: '600' },
});
