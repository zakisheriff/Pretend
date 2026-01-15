import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { ThreeActsData } from '@/types/game';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThreeActsSummary() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gameData = useGameStore((s) => s.gameData?.data as ThreeActsData);
    const nextThreeActsTeam = useGameStore((s) => s.nextThreeActsTeam);
    const players = useGameStore((s) => s.players);

    if (!gameData) return null;

    const currentTeam = gameData.teams[gameData.currentTeamIndex];
    const { roundStats } = currentTeam;

    const handleContinue = () => {
        nextThreeActsTeam();

        // Check if game over (handled in store, phase changes to 'results')
        // We need to react to that phase change, or simpler:
        // `nextThreeActsTeam` updates index or phase.
        // We should navigate to `game` (which will show "Next Team Ready")
        // OR `results` if done.

        // Wait, `nextThreeActsTeam` sets phase to `results` if done.
        // We need manually check store state after update?
        // Better: Hook in `game.tsx` or here?
        // If we call `nextThreeActsTeam`, the store updates.
        // We should verify if we are done.

        const isLastTeam = gameData.currentTeamIndex >= gameData.teams.length - 1;
        if (isLastTeam) {
            router.replace('/three-acts/results');
        } else {
            router.replace('/three-acts/game');
        }
    };

    // Calculate display score for this round
    let roundScore = 0;
    let correctCount = 0;
    if (roundStats.act1.guessed) correctCount++;
    if (roundStats.act2.guessed) correctCount++;
    if (roundStats.act3.guessed) correctCount++;

    if (correctCount === 3) roundScore = 2;
    else if (correctCount === 2) roundScore = 1;
    else if (correctCount === 1) roundScore = 1;

    // Display Logic
    const renderActResult = (actNum: number, stat: typeof roundStats.act1) => {
        let iconName: keyof typeof Ionicons.glyphMap;
        let iconColor: string;

        if (stat.guessed) {
            iconName = 'checkmark-circle';
            iconColor = Colors.success;
        } else if (stat.skipped) {
            iconName = 'arrow-forward-circle';
            iconColor = Colors.candlelight; // Keep original color for skipped
        } else {
            // Failed / Time out
            iconName = 'close-circle';
            iconColor = Colors.danger;
        }

        return (
            <View style={styles.resultRow}>
                <View style={styles.actLabelBox}>
                    <Text style={styles.actLabel}>Act {actNum}</Text>
                </View>
                <View style={styles.movieBox}>
                    <Text style={styles.movieTitle}>{stat.chosen || "Time out"}</Text>
                    {!stat.chosen && <Text style={styles.subtext}>Did not select</Text>}
                </View>
                <Ionicons name={iconName} size={28} color={iconColor} />
            </View>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <Text style={styles.headerTitle}>Round Complete</Text>

            <View style={styles.scoreCard}>
                <Text style={styles.teamName}>
                    {players.find(p => p.id === currentTeam.player1Id)?.name} & {players.find(p => p.id === currentTeam.player2Id)?.name}
                </Text>
                <Text style={styles.scoreText}>+{roundScore} pts</Text>
            </View>

            <ScrollView style={styles.resultsList}>
                {renderActResult(1, roundStats.act1)}
                {renderActResult(2, roundStats.act2)}
                {renderActResult(3, roundStats.act3)}
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Continue"
                    onPress={handleContinue}
                    variant="primary"
                    style={{ width: '100%' }}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, padding: 20 },
    headerTitle: { fontSize: 32, color: Colors.parchment, fontWeight: '800', textAlign: 'center', marginBottom: 30 },

    scoreCard: { backgroundColor: 'rgba(196, 167, 108, 0.1)', padding: 20, borderRadius: 16, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: Colors.candlelight },
    teamName: { fontSize: 20, color: Colors.parchment, fontWeight: '700' },
    scoreText: { fontSize: 36, color: Colors.candlelight, fontWeight: '900', marginTop: 10 },

    resultsList: { flex: 1, gap: 16 },
    resultRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayDark, padding: 16, borderRadius: 12, marginBottom: 12 },
    actLabelBox: { width: 60, marginRight: 12 },
    actLabel: { color: Colors.grayLight, fontSize: 14, fontWeight: '700' },
    movieBox: { flex: 1 },
    movieTitle: { color: Colors.parchment, fontSize: 18, fontWeight: '600' },
    subtext: { color: Colors.gray, fontSize: 12 },

    footer: { marginTop: 20 },
});
