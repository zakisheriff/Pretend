import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResultsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const selectedWord = useGameStore((s) => s.selectedWord);
    const impostersCaught = useGameStore((s) => s.impostersCaught);
    const getVoteResults = useGameStore((s) => s.getVoteResults);
    const resetGame = useGameStore((s) => s.resetGame);
    const resetToHome = useGameStore((s) => s.resetToHome);

    const voteResults = getVoteResults();
    const imposters = players.filter((p) => p.isImposter);
    const hasVotes = voteResults.some((r) => r.votes > 0);

    useEffect(() => { haptics.success(); }, []);

    const handleAgain = () => { haptics.medium(); resetGame(); router.push('/add-players'); };
    const handleHome = () => { haptics.medium(); resetToHome(); router.dismissAll(); router.replace('/'); };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Winner Banner */}
                <Animated.View
                    entering={ZoomIn.delay(200).springify()}
                    style={[
                        styles.winnerBanner,
                        impostersCaught ? styles.winnerInvestigators : styles.winnerImposter
                    ]}
                >
                    <Ionicons
                        name={impostersCaught ? "shield-checkmark" : "skull"}
                        size={60}
                        color={impostersCaught ? Colors.detective : Colors.suspect}
                    />
                    <Text style={[styles.winnerTitle, impostersCaught ? styles.winnerTitleInvestigators : styles.winnerTitleImposter]}>
                        {impostersCaught ? 'INVESTIGATORS WIN!' : 'IMPOSTER WINS!'}
                    </Text>
                    <Text style={styles.winnerSubtitle}>
                        {impostersCaught ? 'The suspect has been caught!' : 'The imposter escaped justice!'}
                    </Text>
                </Animated.View>

                {/* Imposter Reveal */}
                <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                    <Text style={styles.sectionLabel}>THE IMPOSTER{imposters.length > 1 ? 'S' : ''}</Text>
                    <View style={styles.imposterGrid}>
                        {imposters.map((imposter) => (
                            <View key={imposter.id} style={styles.imposterCard}>
                                <View style={styles.imposterAvatar}>
                                    <Ionicons name="skull" size={32} color={Colors.parchmentLight} />
                                </View>
                                <Text style={styles.imposterName}>{imposter.name}</Text>
                                <Text style={styles.imposterRole}>Imposter</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Secret Word */}
                <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.section}>
                    <Text style={styles.sectionLabel}>THE SECRET WORD WAS</Text>
                    <View style={styles.wordCard}>
                        <Ionicons name="eye" size={24} color={Colors.candlelight} style={{ marginBottom: 8 }} />
                        <Text style={styles.wordText}>{selectedWord?.word}</Text>
                    </View>
                </Animated.View>

                {/* Vote Results (Only show if there were votes) */}
                {hasVotes && (
                    <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>VOTING RESULTS</Text>
                        <View style={styles.votesList}>
                            {voteResults.map((r, i) => {
                                const p = players.find((x) => x.id === r.playerId);
                                if (r.votes === 0) return null;
                                return (
                                    <View key={r.playerId} style={[styles.voteRow, p?.isImposter && styles.voteRowImposter]}>
                                        <View style={[styles.voteAvatar, p?.isImposter && styles.voteAvatarImposter]}>
                                            <Text style={styles.voteInitial}>{p?.name.charAt(0).toUpperCase()}</Text>
                                        </View>
                                        <Text style={[styles.voteName, p?.isImposter && styles.voteNameImposter]}>{p?.name}</Text>
                                        <View style={styles.voteBadge}>
                                            <Text style={styles.voteCount}>{r.votes}</Text>
                                        </View>
                                        {p?.isImposter && (
                                            <Ionicons name="skull" size={16} color={Colors.suspect} style={{ marginLeft: 6 }} />
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </Animated.View>
                )}

                {/* Action Buttons */}
                <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.buttons}>
                    <Button
                        title="PLAY AGAIN"
                        onPress={handleAgain}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="refresh" size={18} color={Colors.victorianBlack} />}
                    />
                    <Button
                        title="BACK TO HOME"
                        onPress={handleHome}
                        variant="outline"
                        size="large"
                        icon={<Ionicons name="home-outline" size={16} color={Colors.candlelight} />}
                    />
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 20, gap: 24 },

    // Winner Banner
    winnerBanner: {
        alignItems: 'center',
        padding: 30,
        borderRadius: 20,
        gap: 12,
        borderWidth: 2,
    },
    winnerInvestigators: {
        backgroundColor: 'rgba(34, 139, 34, 0.15)',
        borderColor: Colors.detective,
    },
    winnerImposter: {
        backgroundColor: 'rgba(160, 32, 32, 0.15)',
        borderColor: Colors.suspect,
    },
    winnerTitle: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: 2,
        textAlign: 'center',
    },
    winnerTitleInvestigators: { color: Colors.detective },
    winnerTitleImposter: { color: Colors.suspect },
    winnerSubtitle: {
        fontSize: 14,
        color: Colors.grayLight,
        textAlign: 'center',
    },

    // Section
    section: { gap: 12 },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.candlelight,
        letterSpacing: 2,
        textAlign: 'center',
    },

    // Imposter Card
    imposterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12,
    },
    imposterCard: {
        backgroundColor: 'rgba(160, 32, 32, 0.2)',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.suspect,
        minWidth: 120,
    },
    imposterAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: Colors.suspect,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    imposterName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.parchment,
        textAlign: 'center',
    },
    imposterRole: {
        fontSize: 12,
        color: Colors.suspect,
        fontWeight: '600',
        marginTop: 4,
    },

    // Word Card
    wordCard: {
        backgroundColor: Colors.grayDark,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.candlelight,
    },
    wordText: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.candlelight,
        letterSpacing: 2,
        textTransform: 'uppercase',
    },

    // Vote Results
    votesList: { gap: 8 },
    voteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.grayDark,
        padding: 12,
        borderRadius: 12,
        gap: 12,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    voteRowImposter: {
        borderColor: Colors.suspect,
        backgroundColor: 'rgba(160, 32, 32, 0.1)',
    },
    voteAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: Colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    voteAvatarImposter: { backgroundColor: Colors.suspect },
    voteInitial: { fontSize: 14, fontWeight: '700', color: Colors.parchment },
    voteName: { flex: 1, fontSize: 15, color: Colors.parchment, fontWeight: '500' },
    voteNameImposter: { color: Colors.suspect, fontWeight: '700' },
    voteBadge: {
        backgroundColor: Colors.candlelight,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    voteCount: { fontSize: 13, fontWeight: '700', color: Colors.victorianBlack },

    // Buttons
    buttons: { gap: 12, marginTop: 8 },
});
