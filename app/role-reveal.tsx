import { Button, RoleRevealCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
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

    const [hasRevealed, setHasRevealed] = useState(false);

    const currentPlayer = getCurrentPlayer();
    const isLast = currentRevealIndex === players.length - 1;

    // Block back navigation during role reveal
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

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
            // Last player done - go DIRECTLY to countdown
            nextReveal();
            haptics.gameStart();
            router.push('/first-player');
        } else {
            setHasRevealed(false);
            nextReveal();
        }
    };

    if (!currentPlayer) return null;
    const playerRole = getPlayerRole(currentPlayer.id);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.progress}>
                <Text style={styles.progressText}>Player {currentRevealIndex + 1} of {players.length}</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${((currentRevealIndex + 1) / players.length) * 100}%` }]} />
                </View>
            </View>

            <View style={styles.cardArea}>
                <RoleRevealCard
                    key={currentPlayer.id}
                    playerName={currentPlayer.name}
                    isImposter={playerRole.isImposter}
                    word={playerRole.word}
                    hint={playerRole.hint}
                    hasRevealed={hasRevealed}
                    onReveal={handleReveal}
                    movie={playerRole.movie}
                    genre={playerRole.genre}
                    movieHint={playerRole.movieHint}
                    isDirector={playerRole.isDirector}
                    question={playerRole.question}
                    isOutlier={playerRole.isOutlier}
                />
            </View>

            {hasRevealed && (
                <View style={styles.footer}>
                    <View style={styles.passRow}>
                        <Ionicons name="hand-left-outline" size={14} color={Colors.candlelight} style={styles.passIcon} />
                        <Text style={styles.passText}>
                            {isLast ? 'Ready to begin investigation!' : 'Pass the case file to next investigator'}
                        </Text>
                    </View>
                    <Button
                        title={isLast ? "Begin Investigation" : "Next Investigator"}
                        onPress={handleNext}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name={isLast ? "search" : "arrow-forward"} size={18} color={Colors.victorianBlack} />}
                    />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, paddingHorizontal: 16 },
    progress: { paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
    progressText: { fontSize: 12, color: Colors.candlelight, marginBottom: 8, letterSpacing: 1, fontWeight: '600' },
    progressBar: { width: '100%', height: 3, backgroundColor: Colors.gray, borderRadius: 2 },
    progressFill: { height: '100%', backgroundColor: Colors.candlelight, borderRadius: 2 },
    cardArea: { flex: 1, justifyContent: 'center', paddingVertical: 20 },
    footer: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, marginBottom: 10 },
    passRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
    passIcon: { marginRight: 10 },
    passText: { fontSize: 13, color: Colors.candlelight, fontStyle: 'italic' },
});
