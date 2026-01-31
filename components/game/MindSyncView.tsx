import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { Player } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
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
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [timeLeft, setTimeLeft] = useState(gameData?.data?.timer || 20);
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

    // Get answers from game data
    const answers = gameData?.data?.answers || {};
    const allAnswers = Object.entries(answers).map(([playerId, answer]) => {
        const player = players.find(p => p.id === playerId);
        return { playerId, playerName: player?.name || 'Unknown', answer: answer as string };
    });

    // Check if already submitted
    useEffect(() => {
        if (myPlayerId && answers[myPlayerId]) {
            setHasSubmitted(true);
            setAnswer(answers[myPlayerId]);
        }
    }, [answers, myPlayerId]);

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
            await GameAPI.updateGamePhase(roomCode, 'voting');
        } finally {
            setLoading(false);
        }
    };

    // Count answered players
    const answeredCount = Object.keys(answers).length;
    const totalPlayers = players.length;

    // Answering Phase
    if (gamePhase === 'MINDSYNC:ANSWERING') {
        return (
            <View style={styles.container}>
                {/* Role indicator */}
                <Animated.View entering={FadeIn.delay(100)} style={styles.roleHeader}>
                    <Ionicons
                        name={questionData?.isOutlier ? 'help-circle' : 'checkmark-circle'}
                        size={16}
                        color={questionData?.isOutlier ? Colors.suspect : Colors.candlelight}
                    />
                    <Text style={[styles.roleText, { color: questionData?.isOutlier ? Colors.suspect : Colors.candlelight }]}>
                        {questionData?.isOutlier ? 'YOU HAVE A DIFFERENT QUESTION' : 'ANSWER QUICKLY!'}
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

                {/* Host Force Reveal */}
                {isHost && hasSubmitted && answeredCount < totalPlayers && (
                    <Button
                        title="Force Reveal"
                        onPress={handleReveal}
                        variant="secondary"
                        loading={loading}
                        style={{ marginTop: 20 }}
                    />
                )}
            </View>
        );
    }

    // Reveal Phase
    if (gamePhase === 'MINDSYNC:REVEAL') {
        return (
            <View style={styles.container}>
                <Animated.View entering={FadeIn} style={styles.revealHeader}>
                    <Ionicons name="bulb" size={24} color={Colors.candlelight} />
                    <Text style={styles.revealTitle}>ANSWERS REVEALED</Text>
                </Animated.View>

                {/* All Answers */}
                <View style={styles.answersGrid}>
                    {allAnswers.map((item, index) => {
                        const isMe = item.playerId === myPlayerId;
                        const player = players.find(p => p.id === item.playerId);
                        const isOutlier = player?.role === 'outlier';

                        return (
                            <Animated.View
                                key={item.playerId}
                                entering={FadeInDown.delay(index * 100)}
                                style={[
                                    styles.answerCard,
                                    isMe && styles.answerCardMine,
                                    isOutlier && styles.answerCardOutlier
                                ]}
                            >
                                <Text style={styles.answerPlayerName}>{item.playerName}</Text>
                                <Text style={styles.answerText}>"{item.answer}"</Text>
                            </Animated.View>
                        );
                    })}
                </View>

                {/* Hint */}
                <View style={styles.hintCard}>
                    <Ionicons name="eye" size={16} color={Colors.suspect} />
                    <Text style={styles.hintText}>
                        One person had a DIFFERENT question. Find the Outlier!
                    </Text>
                </View>

                {/* Host: Start Discussion */}
                {isHost && (
                    <Button
                        title="Start Discussion"
                        onPress={handleStartDiscussion}
                        variant="primary"
                        loading={loading}
                        icon={<Ionicons name="chatbubbles" size={20} color={Colors.victorianBlack} />}
                        style={{ marginTop: 24 }}
                    />
                )}
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

            {/* Show your question */}
            <View style={styles.yourQuestionCard}>
                <Text style={styles.yourQuestionLabel}>Your Question Was:</Text>
                <Text style={styles.yourQuestionText}>{questionData?.question}</Text>
            </View>

            {/* All Answers Reference */}
            <View style={styles.answersGrid}>
                {allAnswers.map((item) => {
                    const isMe = item.playerId === myPlayerId;
                    return (
                        <View
                            key={item.playerId}
                            style={[styles.answerCardSmall, isMe && styles.answerCardMine]}
                        >
                            <Text style={styles.answerPlayerNameSmall}>{item.playerName}</Text>
                            <Text style={styles.answerTextSmall}>"{item.answer}"</Text>
                        </View>
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
});
