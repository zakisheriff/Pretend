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
    const gameData = useGameStore((s) => s.gameData);
    const gameMode = useGameStore((s) => s.gameMode);
    const impostersCaught = useGameStore((s) => s.impostersCaught);
    const getVoteResults = useGameStore((s) => s.getVoteResults);
    const getModeDisplayInfo = useGameStore((s) => s.getModeDisplayInfo);
    const resetGame = useGameStore((s) => s.resetGame);
    const resetToHome = useGameStore((s) => s.resetToHome);

    const voteResults = getVoteResults();
    const specialPlayers = players.filter((p) => p.isImposter);
    const hasVotes = voteResults.some((r) => r.votes > 0);
    const { specialRoleName, specialRoleIcon, normalRoleName } = getModeDisplayInfo();

    useEffect(() => { haptics.success(); }, []);

    const handleAgain = () => { haptics.medium(); resetGame(); router.push('/add-players'); };
    const handleHome = () => { haptics.medium(); resetToHome(); router.dismissAll(); router.replace('/'); };

    // Mode-specific content
    const getWinnerText = () => {
        switch (gameMode) {
            case 'undercover-word':
                // Classic Imposter
                return impostersCaught
                    ? { title: 'Crewmates Win!', subtitle: 'The Imposter was caught!' }
                    : { title: 'Imposter Wins!', subtitle: 'The Imposter escaped justice!' };
            case 'directors-cut':
                return impostersCaught
                    ? { title: 'Viewers Win!', subtitle: 'The Director was identified!' }
                    : { title: 'Director Wins!', subtitle: 'The Director stayed hidden!' };
            case 'mind-sync':
                return impostersCaught
                    ? { title: 'In Sync Wins!', subtitle: 'The outlier was spotted!' }
                    : { title: 'Outlier Wins!', subtitle: 'The outlier stayed undetected!' };
            case 'classic-imposter':
                // Undercover
                return impostersCaught
                    ? { title: 'Players Win!', subtitle: 'The Undercover was found!' }
                    : { title: 'Undercover Wins!', subtitle: 'The Undercover blended in perfectly!' };
            default:
                return impostersCaught
                    ? { title: 'Investigators Win!', subtitle: 'The suspect has been caught!' }
                    : { title: 'Imposter Wins!', subtitle: 'The Imposter escaped justice!' };
        }
    };

    const getRevealContent = () => {
        switch (gameMode) {
            case 'undercover-word':
                if (gameData?.type === 'undercover-word') {
                    return {
                        label: 'The Words Were',
                        content: (
                            <View style={styles.wordCompare}>
                                <View style={styles.wordBox}>
                                    <Text style={styles.wordLabel}>Crewmates</Text>
                                    <Text style={styles.wordTextBig}>{gameData.data.mainWord}</Text>
                                </View>
                                <Text style={styles.vsText}>vs</Text>
                                <View style={[styles.wordBox, styles.wordBoxDanger]}>
                                    <Text style={styles.wordLabel}>Undercover</Text>
                                    <Text style={[styles.wordTextBig, styles.dangerText]}>{gameData.data.undercoverWord}</Text>
                                </View>
                            </View>
                        ),
                    };
                }
                return {
                    label: 'The Secret Word Was',
                    content: <Text style={styles.wordText}>{selectedWord?.word}</Text>,
                };

            case 'directors-cut':
                if (gameData?.type === 'directors-cut') {
                    return {
                        label: 'The Movie Was',
                        content: (
                            <View style={styles.movieReveal}>
                                <Text style={styles.wordText}>{gameData.data.movie}</Text>
                                <Text style={styles.genreText}>Genre: {gameData.data.genre}</Text>
                            </View>
                        ),
                    };
                }
                return null;

            case 'mind-sync':
                if (gameData?.type === 'mind-sync') {
                    return {
                        label: 'The Questions Were',
                        content: (
                            <View style={styles.questionCompare}>
                                <View style={styles.questionBox}>
                                    <Text style={styles.questionLabel}>Majority</Text>
                                    <Text style={styles.questionText}>{gameData.data.mainQuestion}</Text>
                                </View>
                                <View style={[styles.questionBox, styles.questionBoxDanger]}>
                                    <Text style={styles.questionLabel}>Outlier</Text>
                                    <Text style={[styles.questionText, styles.dangerText]}>{gameData.data.outlierQuestion}</Text>
                                </View>
                            </View>
                        ),
                    };
                }
                return null;

            case 'classic-imposter':
                if (gameData?.type === 'classic-imposter') {
                    return {
                        label: `The ${gameData.data.themeName} Were`,
                        content: (
                            <View style={styles.wordCompare}>
                                <View style={styles.wordBox}>
                                    <Text style={styles.wordLabel}>Crewmates</Text>
                                    <Text style={styles.wordTextBig}>{gameData.data.crewmateWord}</Text>
                                </View>
                                <Text style={styles.vsText}>vs</Text>
                                <View style={[styles.wordBox, styles.wordBoxDanger]}>
                                    <Text style={styles.wordLabel}>Imposter</Text>
                                    <Text style={[styles.wordTextBig, styles.dangerText]}>{gameData.data.imposterWord}</Text>
                                </View>
                            </View>
                        ),
                    };
                }
                return null;

            default:
                return {
                    label: 'The Secret Word Was',
                    content: <Text style={styles.wordText}>{selectedWord?.word}</Text>,
                };
        }
    };

    const winnerText = getWinnerText();
    const revealContent = getRevealContent();

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
                        {winnerText.title}
                    </Text>
                    <Text style={styles.winnerSubtitle}>
                        {winnerText.subtitle}
                    </Text>
                </Animated.View>

                {/* Special Player Reveal */}
                <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                    <Text style={styles.sectionLabel}>The {specialRoleName}{specialPlayers.length > 1 ? 's' : ''}</Text>
                    <View style={styles.imposterGrid}>
                        {specialPlayers.map((player) => (
                            <View key={player.id} style={styles.imposterCard}>
                                <View style={styles.imposterAvatar}>
                                    <Ionicons name={specialRoleIcon as any} size={28} color={Colors.parchmentLight} />
                                </View>
                                <Text style={styles.imposterName}>{player.name}</Text>
                                <Text style={styles.imposterRole}>{specialRoleName}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Reveal Content */}
                {revealContent && (
                    <Animated.View entering={FadeInUp.delay(600).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>{revealContent.label}</Text>
                        <View style={styles.wordCard}>
                            {revealContent.content}
                        </View>
                    </Animated.View>
                )}

                {/* Vote Results (Only show if there were votes) */}
                {hasVotes && (
                    <Animated.View entering={FadeInUp.delay(800).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>Voting Results</Text>
                        <View style={styles.votesList}>
                            {voteResults.map((r) => {
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
                                            <Ionicons name={specialRoleIcon as any} size={16} color={Colors.suspect} style={{ marginLeft: 4 }} />
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
                        title="Play Again"
                        onPress={handleAgain}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="refresh" size={18} color={Colors.victorianBlack} />}
                    />
                    <Button
                        title="Back to Home"
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
        borderRadius: 28,
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
        fontSize: 24,
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
        borderRadius: 24,
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
    specialIcon: { fontSize: 28 },
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
        borderRadius: 24,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.candlelight,
    },
    wordText: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.candlelight,
        marginBottom: 8,
        letterSpacing: 2,

        textAlign: 'center',
    },

    // Word Compare (for Undercover Word)
    wordCompare: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    wordBox: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    wordBoxDanger: {},
    wordLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.grayLight,
        letterSpacing: 2,
    },
    wordTextBig: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.parchment,
        textAlign: 'center',
    },
    vsText: {
        fontSize: 14,
        color: Colors.grayMedium,
        fontWeight: '600',
    },
    dangerText: { color: Colors.suspect },

    // Movie Reveal
    movieReveal: {
        alignItems: 'center',
        gap: 8,
    },
    genreText: {
        fontSize: 13,
        color: Colors.grayLight,
        fontStyle: 'italic',
    },

    // Question Compare
    questionCompare: {
        gap: 16,
        width: '100%',
    },
    questionBox: {
        padding: 16,
        backgroundColor: 'rgba(196, 167, 108, 0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.candlelight,
    },
    questionBoxDanger: {
        backgroundColor: 'rgba(160, 32, 32, 0.1)',
        borderColor: Colors.suspect,
    },
    questionLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.grayLight,
        letterSpacing: 2,
        marginBottom: 8,
    },
    questionText: {
        fontSize: 15,
        color: Colors.parchment,
        lineHeight: 22,
    },

    // Vote Results
    votesList: { gap: 8 },
    voteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.grayDark,
        padding: 12,
        borderRadius: 20,
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
        borderRadius: 16,
    },
    voteCount: { fontSize: 13, fontWeight: '700', color: Colors.victorianBlack },
    specialBadgeSmall: { fontSize: 16, marginLeft: 4 },

    // Buttons
    buttons: { gap: 12, marginTop: 8 },
});
