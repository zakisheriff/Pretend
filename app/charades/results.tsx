import { Button, ScoreBoard, WinnerCelebration } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CharadesResultsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const params = useLocalSearchParams();

    // Get data passed from game screen
    const correctCount = parseInt(params.score as string || '0');
    const duration = parseInt(params.duration as string || '60');
    // Use passed points if available, otherwise 0 (display only)
    const pointsEarned = params.pointsEarned ? parseInt(params.pointsEarned as string) : 0;
    const winnerId = params.winnerId as string || null;

    const players = useGameStore((s) => s.players);
    const currentPlayer = useGameStore((s) => s.players.find(p => p.id === (params.playerId as string)));
    const winner = winnerId ? players.find(p => p.id === winnerId) : null;

    // STRICTLY ENFORCE PORTRAIT
    useEffect(() => {
        const lockPortrait = async () => {
            try {
                await ScreenOrientation.unlockAsync();
                await new Promise(r => setTimeout(r, 50));
                await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
            } catch (e) {
                console.warn('Failed to lock portrait:', e);
            }
        };
        lockPortrait();

        // Prevent hardware back button from messing up flow
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
            router.replace('/');
            return true;
        });
        return () => backHandler.remove();
    }, []);

    const handlePlayAgain = () => {
        haptics.medium();
        // Go back to mode selection as requested
        router.replace('/select-mode');
    };

    const handleHome = () => {
        haptics.medium();
        router.dismissAll();
        router.replace('/');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.content}>
                <Text style={styles.gameOverTitle}>Time's Up!</Text>

                <View style={styles.scoreContainer}>
                    <Text style={styles.finalCount}>{correctCount}</Text>
                    <Text style={styles.scoreLabel}>WORDS CORRECT </Text>
                </View>

                {pointsEarned > 0 ? (
                    <Text style={styles.pointsEarned}>+ {pointsEarned} POINTS EARNED!</Text>
                ) : (
                    <Text style={styles.noPoints}>No points earned this round.</Text>
                )}

                {/* Mini Leaderboard */}
                <View style={styles.leaderboard}>
                    <ScoreBoard players={players} />
                </View>

                <View style={styles.footerButtons}>
                    <Button
                        title="Play Again"
                        onPress={handlePlayAgain}
                        variant="primary"
                        icon={<Ionicons name="refresh" size={20} color={Colors.victorianBlack} />}
                    />
                    <Button
                        title="Home"
                        onPress={handleHome}
                        variant="outline"
                        icon={<Ionicons name="home" size={20} color={Colors.parchment} />}
                    />
                </View>
            </View>

            {/* Tournament Winner Celebration */}
            {winner && (
                <WinnerCelebration
                    winner={winner}
                    allPlayers={players}
                    onNewGame={() => {
                        useGameStore.getState().resetTournament();
                        router.replace('/select-mode');
                    }}
                    onHome={() => {
                        useGameStore.getState().resetToHome();
                        router.replace('/');
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        width: '90%',
        maxWidth: 400,
        alignItems: 'center',
    },
    gameOverTitle: {
        fontSize: 48,
        fontWeight: 'bold',
        color: Colors.imposter, // Red color for "Time's Up" feeling
        marginBottom: 20,
    },
    scoreContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    finalCount: {
        fontSize: 80,
        fontWeight: 'bold',
        color: Colors.success,
        lineHeight: 80,
    },
    scoreLabel: {
        fontSize: 16,
        color: Colors.grayLight,
        letterSpacing: 2,
        marginTop: 5,
    },
    pointsEarned: {
        fontSize: 24,
        color: Colors.candlelight,
        fontWeight: 'bold',
        marginBottom: 30,
        textAlign: 'center',
    },
    noPoints: {
        fontSize: 18,
        color: Colors.grayLight,
        marginBottom: 30,
        fontStyle: 'italic',
    },
    leaderboard: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        gap: 10,
    },
    footerButtons: {
        width: '100%',
        gap: 15,
    }
});
