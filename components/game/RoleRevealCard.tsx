import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { PanResponder, StyleSheet, Text, View } from 'react-native';

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
    const [peekAmount, setPeekAmount] = useState(hasRevealed ? 300 : 0);
    const [hasPeeked, setHasPeeked] = useState(hasRevealed);

    const panResponder = React.useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => !hasPeeked,
        onMoveShouldSetPanResponder: () => !hasPeeked,
        onPanResponderMove: (_, gestureState) => {
            if (gestureState.dy < 0) {
                const newPeek = Math.min(Math.abs(gestureState.dy), 300);
                setPeekAmount(newPeek);
            }
        },
        onPanResponderRelease: (_, gestureState) => {
            if (Math.abs(gestureState.dy) > PEEK_THRESHOLD) {
                setHasPeeked(true);
                setPeekAmount(300);
                if (isImposter) {
                    haptics.imposterReveal();
                } else {
                    haptics.success();
                }
                onReveal();
            } else {
                setPeekAmount(0);
            }
        },
    }), [hasPeeked, isImposter, onReveal]);

    return (
        <View style={styles.container}>
            {/* Role content - always visible underneath */}
            <View style={styles.revealCard}>
                <View style={styles.roleContainer}>
                    <Text style={styles.roleLabel}>YOUR ROLE</Text>
                    <Text style={[styles.roleText, isImposter ? styles.imposterText : styles.crewmateText]}>
                        {isImposter ? 'IMPOSTER' : 'CREWMATE'}
                    </Text>
                </View>

                <View style={styles.divider} />

                {(isImposter && !hint) ? (
                    <View style={[styles.infoContainer, { opacity: 0.5 }]}>
                        <Text style={styles.infoLabel}>YOUR HINT</Text>
                        <Text style={[styles.hintText, { fontStyle: 'italic' }]}>No hint available</Text>
                    </View>
                ) : (
                    <View style={styles.infoContainer}>
                        <Text style={styles.infoLabel}>{isImposter ? 'YOUR HINT' : 'SECRET WORD'}</Text>
                        <Text style={isImposter ? styles.hintText : styles.wordText}>
                            {isImposter ? hint : word}
                        </Text>
                    </View>
                )}

                {isImposter && (
                    <View style={styles.warningBox}>
                        <Ionicons name="warning" size={16} color={Colors.imposter} />
                        <Text style={styles.warningText}>Blend in. Don't get caught.</Text>
                    </View>
                )}

                {hasPeeked && (
                    <View style={styles.seenBadge}>
                        <Ionicons name="eye" size={14} color={Colors.success} />
                        <Text style={styles.seenText}>You've seen your role</Text>
                    </View>
                )}
            </View>

            {/* Cover card - slides up when dragged */}
            <View
                {...panResponder.panHandlers}
                style={[
                    styles.coverCard,
                    {
                        transform: [{ translateY: -peekAmount }],
                        opacity: hasPeeked ? 0 : 1,
                        pointerEvents: hasPeeked ? 'none' : 'auto',
                    }
                ]}
            >
                <View style={styles.avatar}>
                    <Text style={styles.avatarLetter}>{playerName.charAt(0).toUpperCase()}</Text>
                </View>
                <Text style={styles.playerName}>{playerName}</Text>

                <View style={styles.dragHint}>
                    <Ionicons name="chevron-up" size={20} color={Colors.grayLight} />
                    <Text style={styles.dragText}>DRAG UP TO PEEK</Text>
                    <Ionicons name="chevron-up" size={20} color={Colors.grayLight} />
                </View>

                <View style={styles.handle} />

                {/* Progress indicator */}
                {peekAmount > 0 && (
                    <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${Math.min(100, (peekAmount / PEEK_THRESHOLD) * 100)}%` }]} />
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, position: 'relative' },
    revealCard: {
        position: 'absolute', top: 16, left: 16, right: 16, bottom: 16,
        backgroundColor: Colors.black, borderRadius: 24, padding: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.gray,
    },
    coverCard: {
        position: 'absolute', top: 16, left: 16, right: 16, bottom: 16,
        backgroundColor: Colors.grayDark, borderRadius: 24,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: Colors.gray,
    },
    avatar: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: Colors.gray, alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, borderWidth: 2, borderColor: Colors.white,
    },
    avatarLetter: { fontSize: 28, fontWeight: '700', color: Colors.white },
    playerName: { fontSize: 24, fontWeight: '700', color: Colors.white, marginBottom: 24 },
    dragHint: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        padding: 14, backgroundColor: Colors.black, borderRadius: 12
    },
    dragText: { fontSize: 12, fontWeight: '600', color: Colors.grayLight, letterSpacing: 1 },
    handle: { position: 'absolute', bottom: 16, width: 36, height: 4, backgroundColor: Colors.grayMedium, borderRadius: 2 },
    progressContainer: {
        position: 'absolute', bottom: 28, left: 40, right: 40,
        height: 3, backgroundColor: Colors.gray, borderRadius: 2
    },
    progressBar: { height: '100%', backgroundColor: Colors.white, borderRadius: 2 },
    roleContainer: { alignItems: 'center', marginBottom: 20 },
    roleLabel: { fontSize: 11, fontWeight: '500', color: Colors.grayLight, letterSpacing: 3, marginBottom: 8 },
    roleText: { fontSize: 28, fontWeight: '800', letterSpacing: 2 },
    imposterText: { color: Colors.imposter },
    crewmateText: { color: Colors.crewmate },
    divider: { width: 60, height: 1, backgroundColor: Colors.gray, marginVertical: 16 },
    infoContainer: { alignItems: 'center', marginBottom: 20 },
    infoLabel: { fontSize: 11, fontWeight: '500', color: Colors.grayLight, letterSpacing: 3, marginBottom: 8 },
    hintText: { fontSize: 16, color: Colors.white, textAlign: 'center', fontStyle: 'italic', paddingHorizontal: 16 },
    wordText: { fontSize: 24, fontWeight: '700', color: Colors.white, textAlign: 'center' },
    warningBox: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: 'rgba(255,59,48,0.1)', padding: 12, borderRadius: 12,
        borderWidth: 1, borderColor: Colors.imposter, marginTop: 8,
    },
    warningText: { fontSize: 13, color: Colors.imposter, fontWeight: '500' },
    seenBadge: {
        position: 'absolute', bottom: 20,
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(52,199,89,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
        borderWidth: 1, borderColor: Colors.success,
    },
    seenText: { fontSize: 11, color: Colors.success, fontWeight: '500' },
});
