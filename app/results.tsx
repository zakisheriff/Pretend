import { GenericModal } from '@/components/common/GenericModal';
import { Button, ScoreBoard, WinnerCelebration } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResultsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [showRestartModal, setShowRestartModal] = useState(false);
    const [showHomeModal, setShowHomeModal] = useState(false);
    const players = useGameStore((s) => s.players);
    const selectedWord = useGameStore((s) => s.selectedWord);
    const gameData = useGameStore((s) => s.gameData);
    const gameMode = useGameStore((s) => s.gameMode);
    const impostersCaught = useGameStore((s) => s.impostersCaught);
    const directorWinnerId = useGameStore((s) => s.directorWinnerId);
    const directorId = useGameStore((s) => s.directorId);
    const getVoteResults = useGameStore((s) => s.getVoteResults);
    const getModeDisplayInfo = useGameStore((s) => s.getModeDisplayInfo);
    const resetGame = useGameStore((s) => s.resetGame);
    const resetTournament = useGameStore((s) => s.resetTournament);
    const resetToHome = useGameStore((s) => s.resetToHome);
    const gameWinner = useGameStore((s) => s.gameWinner);
    const continueRound = useGameStore((s) => s.continueRound);
    const lastEliminatedPlayerId = useGameStore((s) => s.lastEliminatedPlayerId);
    const overallWinner = useGameStore((s) => s.overallWinner);
    const calculateRoundScores = useGameStore((s) => s.calculateRoundScores);

    const voteResults = getVoteResults();
    const specialPlayers = players.filter((p) => p.isImposter);
    const hasVotes = voteResults.some((r) => r.votes > 0);
    const { specialRoleName, specialRoleIcon, normalRoleName } = getModeDisplayInfo();

    const eliminatedThisRound = players.find(p => p.id === lastEliminatedPlayerId);
    const isRoundSuccess = !!gameWinner
        ? (gameMode === 'directors-cut' ? !!directorWinnerId : gameWinner === 'crewmates')
        : (eliminatedThisRound?.isImposter ?? false);

    useEffect(() => {
        haptics.success();
    }, []);

    const handleAgain = () => {
        haptics.medium();
        router.dismissAll();
        router.replace('/select-mode');
        // Delay reset to prevent UI flash on results screen
        setTimeout(() => resetGame(), 300);
    };

    const handleRestartWithConfirm = () => {
        haptics.warning();
        setShowRestartModal(true);
    };

    const handleContinue = (newWord: boolean) => {
        haptics.medium();
        continueRound(newWord);
        if (newWord) {
            router.replace('/role-reveal');
        } else {
            router.replace('/discussion');
        }
    };

    const handleHome = () => {
        haptics.medium();
        // Check if any player has score > 0
        const hasScores = players.some(p => p.score > 0);
        if (hasScores) {
            setShowHomeModal(true);
        } else {
            resetToHome();
            router.dismissAll();
            router.replace('/');
        }
    };

    // Mode-specific content
    const getWinnerText = () => {
        // Director's Cut special handling
        if (gameMode === 'directors-cut') {
            if (directorWinnerId) {
                const winnerName = players.find(p => p.id === directorWinnerId)?.name || 'A Viewer ';
                return { title: 'Viewers Win!', subtitle: `${winnerName} Guessed The Movie! ` };
            }
            return { title: 'Director Wins! ', subtitle: 'No One Guessed The Movie! ' };
        }

        if (!gameWinner) {
            if (eliminatedThisRound) {
                return {
                    title: `${eliminatedThisRound.name} is Gone! `,
                    subtitle: eliminatedThisRound.isImposter ? `${eliminatedThisRound.name} is an ${specialRoleName} ! ` : `${eliminatedThisRound.name} is a ${normalRoleName}... `
                };
            }
            return { title: 'No One Eliminated', subtitle: 'The vote was a tie!' };
        }

        if (gameWinner === 'crewmates') {
            return { title: 'Crewmates Win!', subtitle: 'All Imposters have been caught! ' };
        } else {
            return { title: 'Imposters Win!', subtitle: 'The Imposters have successfully infiltrated! ' };
        }
    };

    const getRevealContent = () => {
        switch (gameMode) {
            case 'undercover-word':
                if (gameData?.type === 'undercover-word') {
                    return {
                        label: 'The Secret Word Was',
                        content: <Text style={styles.wordText}>{gameData.data.crewmateWord}</Text>,
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
                        isRoundSuccess ? styles.winnerInvestigators : styles.winnerImposter
                    ]}
                >
                    <Ionicons
                        name={isRoundSuccess ? "shield-checkmark" : "skull"}
                        size={60}
                        color={isRoundSuccess ? Colors.detective : Colors.suspect}
                    />
                    <Text style={[styles.winnerTitle, isRoundSuccess ? styles.winnerTitleInvestigators : styles.winnerTitleImposter]}>
                        {winnerText.title}
                    </Text>
                    <Text style={styles.winnerSubtitle}>
                        {winnerText.subtitle}
                    </Text>
                </Animated.View>

                {/* Role Reveal Logic */}
                {(gameMode !== 'directors-cut') && (
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>
                            {!!gameWinner ? `The ${specialRoleName}${specialPlayers.length > 1 ? 's' : ''} ` : 'The Identity'}
                        </Text>
                        <View style={styles.imposterGrid}>
                            {/* If game is over, show ALL imposters. If not over, only show the one who was eliminated. */}
                            {!!gameWinner ? (
                                specialPlayers.map((player) => (
                                    <View key={player.id} style={styles.imposterCard}>
                                        <View style={styles.imposterAvatar}>
                                            <Ionicons name={specialRoleIcon as any} size={28} color={Colors.parchmentLight} />
                                        </View>
                                        <Text style={styles.imposterName}>{player.name}</Text>
                                        <Text style={styles.imposterRole}>{specialRoleName}</Text>
                                    </View>
                                ))
                            ) : (
                                eliminatedThisRound && (
                                    <View key={eliminatedThisRound.id} style={[styles.imposterCard, !eliminatedThisRound.isImposter && { borderColor: Colors.candlelight, backgroundColor: 'rgba(212, 175, 55, 0.1)' }]}>
                                        <View style={[styles.imposterAvatar, !eliminatedThisRound.isImposter && { backgroundColor: Colors.candlelight }]}>
                                            <Ionicons name={eliminatedThisRound.isImposter ? (specialRoleIcon as any) : "person"} size={28} color={Colors.parchmentLight} />
                                        </View>
                                        <Text style={styles.imposterName}>{eliminatedThisRound.name}</Text>
                                        <Text style={[styles.imposterRole, !eliminatedThisRound.isImposter && { color: Colors.candlelight }]}>
                                            {eliminatedThisRound.isImposter ? specialRoleName : normalRoleName}
                                        </Text>
                                    </View>
                                )
                            )}
                        </View>
                    </Animated.View>
                )}

                {/* Director's Cut Winner Spotlight */}
                {gameMode === 'directors-cut' && directorWinnerId && (
                    <Animated.View entering={FadeInUp.delay(400).springify()} style={styles.section}>
                        <Text style={styles.sectionLabel}>Star Viewer</Text>
                        <View style={styles.imposterGrid}>
                            {players.filter(p => p.id === directorWinnerId).map((player) => (
                                <View key={player.id} style={[styles.imposterCard, { borderColor: Colors.detective, backgroundColor: 'rgba(34, 139, 34, 0.2)' }]}>
                                    <View style={[styles.imposterAvatar, { backgroundColor: Colors.detective }]}>
                                        <Ionicons name="trophy" size={28} color={Colors.parchmentLight} />
                                    </View>
                                    <Text style={styles.imposterName}>{player.name}</Text>
                                    <Text style={[styles.imposterRole, { color: Colors.detective }]}>Correct Guesser</Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Reveal Content (Only show if game is over) */}
                {revealContent && (!!gameWinner || gameMode === 'directors-cut') && (
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

                {/* Overall Winner Celebration */}
                {overallWinner && (
                    <WinnerCelebration
                        winner={overallWinner}
                        allPlayers={players}
                        onNewGame={() => {
                            // Queue a reset for when the next game ACTUALLY starts
                            // This allows the user to go back to this screen if they change their mind
                            useGameStore.getState().queueNewTournament();
                            router.push('/select-mode');
                        }}
                        onHome={() => {
                            resetToHome();
                            router.replace('/');
                        }}
                    />
                )}

                {/* Leaderboard Section */}
                <Animated.View entering={FadeInUp.delay(900).springify()} style={styles.section}>
                    <ScoreBoard players={players} />
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View entering={FadeInDown.delay(1000).springify()} style={styles.buttons}>
                    {(!gameWinner && gameMode !== 'directors-cut') ? (
                        <>
                            <Button
                                title="Continue with Same Word"
                                onPress={() => handleContinue(false)}
                                variant="primary"
                                size="large"
                                icon={<Ionicons name="play-outline" size={18} color={Colors.victorianBlack} />}
                            />
                            <Button
                                title="Continue with New Word"
                                onPress={() => handleContinue(true)}
                                variant="outline"
                                size="large"
                                icon={<Ionicons name="refresh-outline" size={18} color={Colors.candlelight} />}
                            />
                            <Button
                                title="Start New Game"
                                onPress={handleRestartWithConfirm}
                                variant="ghost"
                                size="large"
                                icon={<Ionicons name="refresh" size={18} color={Colors.candlelight} />}
                            />
                        </>
                    ) : (
                        <Button
                            title="Play Again"
                            onPress={handleAgain}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="refresh" size={18} color={Colors.victorianBlack} />}
                        />
                    )}
                    <Button
                        title="Back to Home"
                        onPress={handleHome}
                        variant="ghost"
                        size="large"
                        icon={<Ionicons name="home-outline" size={16} color={Colors.grayLight} />}
                    />
                </Animated.View>
            </ScrollView>

            <GenericModal
                visible={showRestartModal}
                title="Start New Game?"
                message="Are you sure you want to start from the beginning with the same players?"
                confirmLabel="Start New"
                isDestructive
                onConfirm={() => {
                    setShowRestartModal(false);
                    handleAgain();
                }}
                onCancel={() => setShowRestartModal(false)}
            />

            <GenericModal
                visible={showHomeModal}
                title="Return to Home?"
                message="Current match progress and scores will be lost. Are you sure?"
                confirmLabel="Return Home"
                isDestructive
                onConfirm={() => {
                    setShowHomeModal(false);
                    resetToHome();
                    router.dismissAll();
                    router.replace('/');
                }}
                onCancel={() => setShowHomeModal(false)}
            />
        </View>
    );
}

const NoirColors = Colors;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: NoirColors.victorianBlack },
    scroll: { flex: 1 },
    scrollContent: {
        flexGrow: 1,
        padding: 20,
        gap: 24,
        width: '100%',
        maxWidth: 600,
        alignSelf: 'center',
    },

    // Winner Banner
    winnerBanner: {
        alignItems: 'center',
        padding: 30,
        borderRadius: 28,
        gap: 12,
        borderWidth: 1,
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
        borderWidth: 1,
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
        borderWidth: 1,
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
        marginBottom: 8,
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

    // Overall Winner Celebration
    overallWinnerBanner: {
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        marginVertical: 24,
        borderWidth: 2,
        borderColor: Colors.candlelight,
        position: 'relative',
        overflow: 'hidden',
    },
    overallWinnerTitle: {
        fontSize: 12,
        fontWeight: '900',
        color: Colors.candlelight,
        letterSpacing: 4,
        marginTop: 12,
        textTransform: 'uppercase',
    },
    overallWinnerText: {
        fontSize: 24,
        fontWeight: '200',
        color: Colors.parchment,
        textAlign: 'center',
        marginTop: 4,
    },
    boldText: {
        fontWeight: '900',
        color: Colors.parchmentLight,
    },
    winnerGlow: {
        position: 'absolute',
        top: -100,
        left: -100,
        right: -100,
        bottom: -100,
        backgroundColor: Colors.candlelight,
        opacity: 0.05,
        borderRadius: 200,
    },

    // Buttons
    buttons: { gap: 12, marginTop: 8 },
});
