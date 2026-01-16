import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { ThreeActsData } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThreeActsGame() {
    useKeepAwake();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const gameData = useGameStore((s) => s.gameData?.data as ThreeActsData);
    const startThreeActsTurn = useGameStore((s) => s.startThreeActsTurn);
    const threeActsSelectOption = useGameStore((s) => s.threeActsSelectOption);
    const threeActsAction = useGameStore((s) => s.threeActsAction);
    const phase = useGameStore((s) => s.phase);

    const [timeLeft, setTimeLeft] = useState(60);

    // Initial load - start turn for first team if not started
    // Actually, store manages phases?
    // StartThreeActsGame sets phase to 'discussion'.
    // We should show "Team X Ready?" screen first.

    useEffect(() => {
        if (!gameData) return;

        if (gameData.timerStarted && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        } else if (timeLeft === 0 && gameData.timerStarted) {
            // Time ran out!
            // End turn automatically?
            // Store doesn't automatically close turn on time.
            // We should treat time out as end of turn.
            // But what if they are mid-act?
            // "The turn stops immediately. No further actions are allowed."
            // So we should navigate to summary?
            router.replace('/three-acts/summary');
        }
    }, [gameData?.timerStarted, timeLeft]);

    useEffect(() => {
        if (gameData?.timerStarted) {
            setTimeLeft(gameData.timeRemaining); // Sync from store if needed, but store constant 60
            // Ideally store tracks time but for 1s ticks local state is better.
        }
    }, [gameData?.timerStarted]);

    // Redirect if results
    useEffect(() => {
        if (phase === 'results') {
            router.replace('/three-acts/results');
        } else if (gameData?.teams[gameData.currentTeamIndex].turnComplete) {
            router.replace('/three-acts/summary');
        }
    }, [phase, gameData?.teams, gameData?.currentTeamIndex]);


    if (!gameData) return null;

    const currentTeam = gameData.teams[gameData.currentTeamIndex];
    const { currentAct, actOptions, currentSelection } = gameData;

    const actTitles = {
        1: "Act 1: One Word",
        2: "Act 2: Quote",
        3: "Act 3: Act It Out"
    };

    const handleOptionSelect = (option: string) => {
        haptics.success();
        threeActsSelectOption(option);
        setTimeout(() => {
            threeActsAction('correct');
        }, 50);
    };

    const handleSkip = () => {
        haptics.medium();
        threeActsAction('skip');
    };

    const handleStartTurn = () => {
        haptics.success();
        setTimeLeft(60);
        startThreeActsTurn();
    };

    if (!gameData.timerStarted) {
        // Ready Screen
        return (
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom, justifyContent: 'center', alignItems: 'center' }]}>
                <Text style={styles.readyTitle}>Team {gameData.currentTeamIndex + 1}</Text>
                <Text style={styles.readyNames}>
                    {useGameStore.getState().players.find(p => p.id === currentTeam.player1Id)?.name}
                    {' & '}
                    {useGameStore.getState().players.find(p => p.id === currentTeam.player2Id)?.name}
                </Text>
                <View style={{ height: 40 }} />
                <Button
                    title="Start Timer"
                    onPress={handleStartTurn}
                    variant="primary"
                    size="large"
                />
            </View>
        );
    }

    const options = actOptions[`act${currentAct}` as keyof typeof actOptions];

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            {/* Content */}
            <View style={styles.content}>
                <Animated.View entering={FadeInDown} style={styles.selectionView}>
                    <View style={[styles.timerBadge, timeLeft <= 10 && styles.timerUrgent]}>
                        <Ionicons name="timer-outline" size={20} color={timeLeft <= 10 ? Colors.danger : Colors.victorianBlack} />
                        <Text style={[styles.timerText, timeLeft <= 10 && { color: Colors.danger }]}>{timeLeft}s</Text>
                    </View>

                    <Text style={styles.actTitle}>{actTitles[currentAct]}</Text>
                    <Text style={styles.instruction}>Tap if your team guesses correct:</Text>

                    <View style={styles.optionsGrid}>
                        {options.map((opt, i) => (
                            <TouchableOpacity
                                key={i}
                                style={styles.optionCard}
                                onPress={() => handleOptionSelect(opt)}
                            >
                                <Text style={styles.optionText}>{opt}</Text>
                                <View style={styles.checkBadge}>
                                    <Ionicons name="checkmark" size={20} color={Colors.victorianBlack} />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Button
                        title="Skip Act"
                        onPress={handleSkip}
                        variant="outline"
                        style={{ marginTop: 20, borderColor: Colors.candlelight, width: '60%' }}
                        textStyle={{ color: Colors.candlelight }}
                    />

                    <Text style={styles.ruleReminder}>
                        {currentAct === 1 ? "One word only!" :
                            currentAct === 2 ? "Quote only (no names)!" :
                                "Silent acting only!"}
                    </Text>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, paddingHorizontal: 20 },
    readyTitle: { fontSize: 24, color: Colors.candlelight, fontWeight: '800' },
    readyNames: { fontSize: 32, color: Colors.parchment, fontWeight: '800', textAlign: 'center', marginTop: 10 },

    actTitle: { fontSize: 32, color: Colors.parchment, fontWeight: '800', textAlign: 'center', marginBottom: 8 },

    timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.candlelight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 20 }, // Added margin bottom
    timerUrgent: { backgroundColor: '#FFD700' },
    timerText: { fontSize: 20, fontWeight: '800', color: Colors.victorianBlack, fontVariant: ['tabular-nums'] },

    content: { flex: 1, justifyContent: 'center' },

    selectionView: { gap: 10, alignItems: 'center', width: '100%' },
    instruction: { color: Colors.grayLight, fontSize: 16, marginBottom: 10, fontStyle: 'italic' },
    optionsGrid: { gap: 16, width: '100%' },
    optionCard: {
        backgroundColor: Colors.grayDark,
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    optionText: { color: Colors.parchment, fontSize: 26, fontWeight: '800', textAlign: 'left', flex: 1 },
    checkBadge: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.success, alignItems: 'center', justifyContent: 'center'
    },

    ruleReminder: { color: Colors.parchment, opacity: 0.7, marginTop: 16, fontStyle: 'italic', fontSize: 14, textAlign: 'center' },
});
