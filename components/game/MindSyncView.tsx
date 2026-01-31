import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { Player } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { Button } from './Button';

interface MindSyncViewProps {
    players: Player[];
    myPlayerId: string;
    roomCode: string;
    gamePhase: string;
    isHost: boolean;
    gameData?: any;
}

export function MindSyncView({ players, myPlayerId, roomCode, gamePhase, isHost, gameData }: MindSyncViewProps) {
    const myPlayer = players.find(p => p.id === myPlayerId);
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);
    const { showAlert, AlertComponent } = useCustomAlert();
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(gameData?.data?.timer || 60);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Parse question data from secretWord
    const questionData = useMemo(() => {
        if (!myPlayer?.secretWord) return null;
        try {
            return JSON.parse(myPlayer.secretWord);
        } catch (e) {
            return null;
        }
    }, [myPlayer?.secretWord]);

    // Get answers from players array (Synced via DB)
    const allAnswers = useMemo(() => {
        return players.map(p => {
            let answer = '';
            try {
                // Robust check for secretWord (camelCase) vs secret_word (snake_case from DB)
                const rawSecret = p.secretWord || (p as any).secret_word || '{}';
                answer = JSON.parse(rawSecret).answer || '';
            } catch (e) { }
            return { playerId: p.id, playerName: p.name, answer };
        }).filter(a => !!a.answer);
    }, [players]);

    // Check if my player submitted (based on vote status or secretWord)
    useEffect(() => {
        if (myPlayer?.vote === 'ANSWERED') {
            setHasSubmitted(true);
            // Optionally restore local answer state from secretWord if needed
            //But we use 'answer' state for input, so let's leave it.
        }
    }, [myPlayer?.vote]);

    // Timer for answering phase
    useEffect(() => {
        if (gamePhase === 'MINDSYNC:ANSWERING' && !hasSubmitted) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev: number) => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        // Auto-submit empty answer if time runs out
                        if (!hasSubmitted && answer.trim()) {
                            handleSubmitAnswer();
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
            };
        }
    }, [gamePhase, hasSubmitted]);

    const handleSubmitAnswer = async () => {
        if (!answer.trim() || hasSubmitted) return;
        setLoading(true);
        haptics.heavy();
        try {
            setHasSubmitted(true);
            const result = await GameAPI.submitMindSyncAnswer(roomCode, myPlayerId, answer.trim());

            // If all answered, host can reveal
            if (result.allAnswered && isHost) {
                await GameAPI.revealMindSyncAnswers(roomCode);
            }
        } catch (error) {
            console.error('Error submitting answer:', error);
            setHasSubmitted(false);
        } finally {
            setLoading(false);
        }
    };

    const handleReveal = async () => {
        setLoading(true);
        haptics.success();
        try {
            await GameAPI.revealMindSyncAnswers(roomCode);
        } finally {
            setLoading(false);
        }
    };

    const handleStartDiscussion = async () => {
        setLoading(true);
        haptics.success();
        try {
            await GameAPI.startMindSyncDiscussion(roomCode);
        } finally {
            setLoading(false);
        }
    };

    const handleStartVoting = async () => {
        setLoading(true);
        haptics.success();
        try {
            await GameAPI.startMindSyncVoting(roomCode);
        } finally {
            setLoading(false);
        }
    };

    // Count answered players (Use 'vote' column as flag)
    const answeredCount = players.filter(p => !!p.vote).length;
    const totalPlayers = players.length;

    // Auto-reveal for Host when everyone has answered
    useEffect(() => {
        if (isHost && answeredCount === totalPlayers && gamePhase === 'MINDSYNC:ANSWERING' && totalPlayers > 0) {
            handleReveal();
        }
    }, [isHost, answeredCount, totalPlayers, gamePhase]);

    // Answering Phase
    if (gamePhase === 'MINDSYNC:ANSWERING') {
        return (
            <View style={styles.container}>
                {/* Generic header - Don't reveal if player is outlier */}
                <Animated.View entering={FadeIn.delay(100)} style={styles.roleHeader}>
                    <Ionicons
                        name="flash"
                        size={16}
                        color={Colors.candlelight}
                    />
                    <Text style={[styles.roleText, { color: Colors.candlelight }]}>
                        ANSWER QUICKLY!
                    </Text>
                </Animated.View>

                {/* Timer */}
                <Animated.View entering={ZoomIn.delay(200)} style={styles.timerContainer}>
                    <Text style={[styles.timerText, timeLeft <= 5 && styles.timerUrgent]}>{timeLeft}s</Text>
                </Animated.View>

                {/* Question */}
                <Animated.View entering={FadeInDown.delay(300)} style={styles.questionCard}>
                    {questionData?.category && (
                        <Text style={styles.categoryLabel}>{questionData.category}</Text>
                    )}
                    <Text style={styles.questionText}>
                        {questionData?.question || 'Loading question...'}
                    </Text>
                </Animated.View>

                {/* Answer Input */}
                {!hasSubmitted ? (
                    <Animated.View entering={FadeInDown.delay(400)} style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={answer}
                            onChangeText={setAnswer}
                            placeholder="Type your answer..."
                            placeholderTextColor={Colors.grayLight}
                            autoCorrect={false}
                            autoCapitalize="sentences"
                            maxLength={50}
                            onSubmitEditing={handleSubmitAnswer}
                        />
                        <Button
                            title="Submit"
                            onPress={handleSubmitAnswer}
                            variant="primary"
                            loading={loading}
                            disabled={!answer.trim() || loading}
                            style={{ marginTop: 16 }}
                        />
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeIn} style={styles.waitingContainer}>
                        <Ionicons name="checkmark-circle" size={48} color={Colors.candlelight} />
                        <Text style={styles.waitingText}>Answer Submitted!</Text>
                        <Text style={styles.waitingSubtext}>
                            Waiting for others... ({answeredCount}/{totalPlayers})
                        </Text>
                    </Animated.View>
                )}

                {/* Host Control: Reveal / Force Reveal */}
                {isHost && (
                    <View style={{ marginTop: 20, width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: Colors.grayLight, marginBottom: 10 }}>
                            {answeredCount}/{totalPlayers} players have answered
                        </Text>
                        <Button
                            title={answeredCount === totalPlayers ? "Reveal Answers" : "Force Reveal"}
                            onPress={handleReveal}
                            variant={answeredCount === totalPlayers ? "primary" : "secondary"}
                            loading={loading}
                            icon={<Ionicons name="bulb" size={20} color={Colors.victorianBlack} />}
                        />
                    </View>
                )}
            </View>
        );
    }



    // Voting Phase
    if (gamePhase === 'voting') {
        const hasVoted = !!myPlayer?.vote;
        const votedCount = players.filter(p => p.vote).length;

        const handleVote = async (targetId: string, playerName: string) => {
            if (targetId === myPlayerId) {
                haptics.warning();
                return;
            }

            haptics.selection();
            showAlert(
                "Confirm Vote",
                `Are you sure you want to vote for ${playerName}?`,
                [
                    { text: "Cancel", style: "cancel", onPress: () => { } },
                    {
                        text: "Confirm",
                        onPress: async () => {
                            await GameAPI.castVote(myPlayerId, targetId);
                            haptics.success();
                        }
                    }
                ]
            );
        };

        const handleEndVoting = async () => {
            setLoading(true);
            try {
                await GameAPI.revealMindSyncResults(roomCode);
            } finally {
                setLoading(false);
            }
        };

        return (
            <View style={styles.container}>
                <View style={styles.discussionHeader}>
                    <Ionicons name="finger-print" size={24} color={Colors.parchment} />
                    <Text style={styles.discussionTitle}>VOTE THE OUTLIER</Text>
                </View>

                <View style={{ width: '100%', marginBottom: 20 }}>
                    <Text style={{ textAlign: 'center', color: Colors.candlelight, fontSize: 16 }}>
                        {hasVoted
                            ? "Waiting for others to vote..."
                            : "Who had a different question?"}
                    </Text>
                </View>

                <View style={{ width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 10 }}>
                    {players.filter(p => p.id !== myPlayerId).map((p) => {
                        const isSelected = myPlayer?.vote === p.id;

                        return (
                            <TouchableOpacity
                                key={p.id}
                                onPress={() => !hasVoted && handleVote(p.id, p.name)}
                                activeOpacity={hasVoted ? 1 : 0.7}
                                disabled={hasVoted}
                                style={[
                                    styles.playerVoteCard,
                                    isSelected && styles.playerVoteCardSelected,
                                ]}
                            >
                                <Ionicons
                                    name="person"
                                    size={24}
                                    color={isSelected ? Colors.victorianBlack : Colors.grayLight}
                                />
                                <Text style={[
                                    styles.playerVoteName,
                                    isSelected && styles.playerVoteNameSelected
                                ]}>
                                    {p.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {isHost && (
                    <View style={{ marginTop: 'auto', marginBottom: 20, width: '100%', alignItems: 'center' }}>
                        <Text style={{ color: Colors.grayLight, marginBottom: 10 }}>
                            {votedCount}/{players.length} players have voted
                        </Text>
                        <Button
                            title="Reveal Results"
                            onPress={handleEndVoting}
                            variant="primary"
                            loading={loading}
                            icon={<Ionicons name="trophy" size={20} color={Colors.victorianBlack} />}
                        />
                    </View>
                )}
                <AlertComponent />
            </View>
        );
    }

    // Discussion Phase - show answers for reference
    return (
        <View style={styles.container}>
            <View style={styles.discussionHeader}>
                <Ionicons name="chatbubbles" size={20} color={Colors.parchment} />
                <Text style={styles.discussionTitle}>DISCUSSION TIME</Text>
            </View>

            {/* Main Question (Crewmate Question) for shared context */}
            <View style={styles.yourQuestionCard}>
                <Text style={styles.yourQuestionLabel}>The Crewmate Question Was:</Text>
                <Text style={styles.yourQuestionText}>
                    {gameData?.data?.mainQuestion || questionData?.question || 'Loading...'}
                </Text>
                {myPlayer?.role === 'outlier' && (
                    <Text style={{ marginTop: 8, color: Colors.suspect, fontStyle: 'italic', fontSize: 12 }}>
                        (You had a different question: {questionData?.question})
                    </Text>
                )}
            </View>

            {/* All Answers Reference - Using the polished Card UI */}
            <View style={styles.answersGrid}>
                {allAnswers.length === 0 && (
                    <Text style={{ color: Colors.grayLight, fontStyle: 'italic', textAlign: 'center', marginVertical: 20 }}>
                        No answers found...
                    </Text>
                )}
                {allAnswers.map((item, index) => {
                    const isMe = item.playerId === myPlayerId;
                    return (
                        <Animated.View
                            key={item.playerId}
                            entering={FadeInDown.delay(index * 100)}
                            style={[styles.answerCard, isMe && styles.answerCardMine]}
                        >
                            <Text style={styles.answerPlayerName}>{item.playerName}</Text>
                            <Text style={styles.answerText}>"{item.answer}"</Text>
                        </Animated.View>
                    );
                })}
            </View>

            {/* Host: Start Voting */}
            {isHost && (
                <Button
                    title="Start Voting"
                    onPress={handleStartVoting}
                    variant="primary"
                    loading={loading}
                    icon={<Ionicons name="finger-print" size={20} color={Colors.victorianBlack} />}
                    style={{ marginTop: 24 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    roleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 20,
        marginBottom: 20,
    },
    roleText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    timerContainer: {
        marginBottom: 20,
    },
    timerText: {
        fontSize: 48,
        fontWeight: '900',
        color: Colors.parchment,
    },
    timerUrgent: {
        color: Colors.suspect,
    },
    questionCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 24,
    },
    categoryLabel: {
        fontSize: 12,
        color: Colors.candlelight,
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    questionText: {
        fontSize: 20,
        color: Colors.parchment,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 28,
    },
    inputContainer: {
        width: '100%',
        alignItems: 'center',
    },
    input: {
        width: '100%',
        height: 56,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 16,
        paddingHorizontal: 20,
        color: Colors.parchment,
        fontSize: 18,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    waitingContainer: {
        alignItems: 'center',
        gap: 12,
    },
    waitingText: {
        fontSize: 18,
        color: Colors.candlelight,
        fontWeight: '700',
    },
    waitingSubtext: {
        fontSize: 14,
        color: Colors.grayLight,
    },
    revealHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
    },
    revealTitle: {
        fontSize: 18,
        color: Colors.candlelight,
        fontWeight: '800',
        letterSpacing: 2,
    },
    answersGrid: {
        width: '100%',
        gap: 12,
    },
    answerCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    answerCardMine: {
        borderColor: Colors.candlelight,
        borderWidth: 2,
    },
    answerCardOutlier: {
        borderColor: Colors.suspect,
        borderWidth: 2,
    },
    answerPlayerName: {
        fontSize: 12,
        color: Colors.grayLight,
        fontWeight: '600',
        marginBottom: 4,
    },
    answerText: {
        fontSize: 16,
        color: Colors.parchment,
        fontWeight: '500',
    },
    answerCardSmall: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    answerPlayerNameSmall: {
        fontSize: 10,
        color: Colors.grayLight,
        fontWeight: '600',
    },
    answerTextSmall: {
        fontSize: 14,
        color: Colors.parchment,
    },
    hintCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: 'rgba(255, 100, 100, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 100, 100, 0.2)',
    },
    hintText: {
        fontSize: 13,
        color: Colors.parchment,
        fontWeight: '500',
        flex: 1,
    },
    discussionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },
    discussionTitle: {
        fontSize: 16,
        color: Colors.parchment,
        fontWeight: '800',
        letterSpacing: 2,
    },
    yourQuestionCard: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    yourQuestionLabel: {
        fontSize: 11,
        color: Colors.grayLight,
        fontWeight: '600',
        marginBottom: 4,
    },
    yourQuestionText: {
        fontSize: 15,
        color: Colors.parchment,
        fontWeight: '500',
    },

    // Voting Styles
    playerVoteCard: {
        width: '45%',
        aspectRatio: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    playerVoteCardSelected: {
        backgroundColor: Colors.parchment,
        borderColor: Colors.parchment,
    },
    playerVoteName: {
        fontSize: 14,
        color: Colors.parchment,
        fontWeight: '600',
        textAlign: 'center',
    },
    playerVoteNameSelected: {
        color: Colors.victorianBlack,
    },
    votedBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: Colors.parchment,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
