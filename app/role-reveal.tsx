import { Button, RoleRevealCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function RoleRevealScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const currentRevealIndex = useGameStore((s) => s.currentRevealIndex);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const getPlayerRole = useGameStore((s) => s.getPlayerRole);
    const revealRole = useGameStore((s) => s.revealRole);
    const nextReveal = useGameStore((s) => s.nextReveal);
    const phase = useGameStore((s) => s.phase);

    // Guard removed

    // Local state to track if current player has revealed (triggers re-render)
    const [hasRevealed, setHasRevealed] = useState(false);

    const currentPlayer = getCurrentPlayer();
    const isLast = currentRevealIndex === players.length - 1;
    const allDone = currentRevealIndex >= players.length;

    // Reset hasRevealed when player changes
    useEffect(() => {
        setHasRevealed(currentPlayer?.hasRevealed || false);
    }, [currentRevealIndex, currentPlayer?.id]);

    const handleReveal = () => {
        if (currentPlayer) {
            revealRole(currentPlayer.id);
            setHasRevealed(true);
        }
    };

    const handleNext = () => {
        haptics.medium();
        if (isLast) {
            // Last player done, go to start game
            nextReveal();
            router.push('/start-game');
        } else {
            setHasRevealed(false);
            nextReveal();
        }
    };

    const handleStart = () => {
        haptics.gameStart();
        router.push('/start-game');
    };

    if (allDone) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.doneContent}>
                    <Ionicons name="checkmark-circle" size={56} color={Colors.success} />
                    <Text style={styles.doneTitle}>ALL READY</Text>
                    <Text style={styles.doneSub}>Everyone knows their role</Text>
                    <Button title="START GAME" onPress={handleStart} variant="primary" size="large" style={{ marginTop: 24 }}
                        icon={<Ionicons name="play" size={18} color={Colors.black} />} />
                </View>
            </View>
        );
    }

    if (!currentPlayer) return null;
    const { isImposter, word, hint } = getPlayerRole(currentPlayer.id);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.progress}>
                <Text style={styles.progressText}>Player {currentRevealIndex + 1} of {players.length}  </Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((currentRevealIndex + 1) / players.length) * 100}%` }]} />
                </View>
            </View>

            <View style={styles.cardArea}>
                <RoleRevealCard
                    key={currentPlayer.id}
                    playerName={currentPlayer.name}
                    isImposter={isImposter}
                    word={word}
                    hint={hint}
                    hasRevealed={hasRevealed}
                    onReveal={handleReveal}
                />
            </View>

            {/* NEXT button - always visible after reveal */}
            {hasRevealed && (
                <View style={styles.footer}>
                    <View style={styles.passRow}>
                        <Ionicons name="phone-portrait-outline" size={14} color={Colors.grayLight} style={styles.passIcon} />
                        <Text style={styles.passText}>Pass phone to {isLast ? 'start discussion' : 'next player'} </Text>
                    </View>
                    <Button
                        title={isLast ? "EVERYONE'S READY" : "NEXT PLAYER"}
                        onPress={handleNext}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name={isLast ? "checkmark" : "arrow-forward"} size={18} color={Colors.black} />}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black, paddingHorizontal: 16 },
    progress: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center' },
    progressText: { fontSize: 12, color: Colors.grayLight, marginBottom: 6, flexShrink: 0 },
    progressBar: { width: '100%', height: 3, backgroundColor: Colors.gray, borderRadius: 2 },
    progressFill: { height: '100%', backgroundColor: Colors.white, borderRadius: 2 },
    cardArea: { flex: 1, justifyContent: 'center', paddingVertical: 20 },
    footer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, marginBottom: 10 },
    passRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    passIcon: { marginRight: 8 },
    passText: { fontSize: 13, color: Colors.grayLight },
    doneContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
    doneTitle: { fontSize: 24, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
    doneSub: { fontSize: 14, color: Colors.grayLight },
});
