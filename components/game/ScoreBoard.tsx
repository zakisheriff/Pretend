import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface ScoreBoardProps {
    players: Player[];
    title?: string;
}

export const ScoreBoard = ({ players, title = "Leaderboard" }: ScoreBoardProps) => {
    // Sort players by score descending
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const topScore = sortedPlayers[0]?.score || 0;
    const WINNING_SCORE = 10;
    const [showRules, setShowRules] = React.useState(false);

    const rules = [
        { mode: 'Classic / Undercover', win: 'Imposter +3', survivors: 'Crew +1' },
        { mode: "Director's Cut", win: 'Correct Guess +2', survivors: 'Director +2' },
        { mode: 'Mind Sync', win: 'Outlier +3', survivors: 'In-Sync +1' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="trophy-outline" size={18} color={Colors.candlelight} />
                <Text style={styles.title}>{title}</Text>
                <Animated.View style={{ marginLeft: 'auto' }}>
                    <Text
                        onPress={() => setShowRules(!showRules)}
                        style={styles.rulesBtn}
                    >
                        {showRules ? 'Close' : 'Rules'}
                    </Text>
                </Animated.View>
            </View>

            {showRules && (
                <Animated.View
                    entering={FadeInUp}
                    style={styles.rulesContainer}
                >
                    {rules.map((rule, i) => (
                        <View key={i} style={styles.ruleRow}>
                            <Text style={styles.ruleMode}>{rule.mode}</Text>
                            <View style={styles.ruleValues}>
                                <Text style={styles.ruleVal}>{rule.win}</Text>
                                <Text style={styles.ruleVal}>{rule.survivors}</Text>
                            </View>
                        </View>
                    ))}
                </Animated.View>
            )}

            <View style={styles.tournamentBanner}>
                <Ionicons name="flash-outline" size={14} color={Colors.candlelight} />
                <Text style={styles.tournamentRule}>First to 10 points wins the match!</Text>
            </View>

            <View style={styles.list}>
                {sortedPlayers.map((player, index) => {
                    const isTop = player.score > 0 && player.score === topScore;
                    const hasWon = player.score >= WINNING_SCORE;

                    return (
                        <Animated.View
                            key={player.id}
                            entering={FadeInUp.delay(index * 100).duration(400)}
                            style={[
                                styles.row,
                                isTop && styles.topRow,
                                hasWon && styles.winningRow
                            ]}
                        >
                            <View style={styles.rankContainer}>
                                <Text style={[styles.rank, isTop && styles.topRank]}>
                                    #{index + 1}
                                </Text>
                            </View>

                            <View style={styles.nameContainer}>
                                <Text style={[styles.name, isTop && styles.topName]} numberOfLines={1}>
                                    {player.name}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                    {player.isEliminated && (
                                        <Text style={styles.eliminatedTag}>Eliminated</Text>
                                    )}
                                    {hasWon && (
                                        <Text style={styles.winnerLabel}>Grand Champion</Text>
                                    )}
                                </View>
                            </View>

                            <View style={styles.scoreContainer}>
                                <Text style={[styles.score, isTop && styles.topScore]}>
                                    {player.score}
                                </Text>
                                <Text style={[styles.pts, isTop && styles.topPts]}>pts</Text>
                            </View>
                        </Animated.View>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(212, 175, 55, 0.05)',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        marginTop: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 16,
    },
    title: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.pureGold,
        letterSpacing: 1,
    },
    list: {
        gap: 10,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 12,
        borderRadius: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },
    topRow: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    rankContainer: {
        width: 30,
        alignItems: 'center',
    },
    rank: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.grayMedium,
    },
    topRank: {
        color: Colors.candlelight,
        fontWeight: '800',
    },
    name: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        color: Colors.parchment,
    },
    topName: {
        fontWeight: '700',
        color: Colors.parchmentLight,
    },
    nameContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    eliminatedTag: {
        fontSize: 10,
        color: Colors.suspect, // Use suspect color for visibility
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    winnerLabel: {
        fontSize: 9,
        color: Colors.candlelight,
        fontWeight: '800',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    winningRow: {
        borderColor: Colors.candlelight,
        borderWidth: 2,
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 2,
    },
    score: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.parchment,
    },
    topScore: {
        color: Colors.candlelight,
        textShadowColor: 'rgba(212, 175, 55, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10,
    },
    pts: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.parchment, // Increased contrast
        opacity: 0.6,
    },
    topPts: {
        color: Colors.candlelight,
        opacity: 0.9,
    },
    rulesBtn: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.candlelight,
        textTransform: 'uppercase',
        letterSpacing: 1,
        padding: 5,
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderRadius: 8,
    },
    rulesContainer: {
        backgroundColor: 'rgba(196, 167, 108, 0.05)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.1)',
        gap: 8,
    },
    ruleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    ruleMode: {
        fontSize: 11,
        color: Colors.parchment,
        fontWeight: '600',
    },
    ruleValues: {
        flexDirection: 'row',
        gap: 8,
    },
    ruleVal: {
        fontSize: 10,
        color: Colors.candlelight,
        fontWeight: '700',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    tournamentBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    tournamentRule: {
        fontSize: 12,
        color: Colors.candlelight,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});
