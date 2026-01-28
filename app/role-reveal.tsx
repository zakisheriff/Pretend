import { GameAPI } from '@/api/game';
import { Button, RoleRevealCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKeepAwake } from 'expo-keep-awake';

export default function RoleRevealScreen() {
    useKeepAwake();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    // Offline Store
    const players = useGameStore((s) => s.players);
    const gameMode = useGameStore((s) => s.gameMode);
    const currentRevealIndex = useGameStore((s) => s.currentRevealIndex);
    const getCurrentPlayer = useGameStore((s) => s.getCurrentPlayer);
    const getPlayerRole = useGameStore((s) => s.getPlayerRole);
    const revealRole = useGameStore((s) => s.revealRole);
    const nextReveal = useGameStore((s) => s.nextReveal);
    const refreshTheme = useGameStore((s) => s.refreshTheme);

    // Online Store
    const {
        roomCode,
        players: onlinePlayers,
        myPlayerId,
        isHost,
        gameMode: onlineMode,
        gamePhase: onlinePhase,
        roomDeleted,
        leaveGame
    } = useOnlineGameStore();

    const [hasRevealed, setHasRevealed] = useState(false);

    const isOnline = !!roomCode;
    const activeMode = isOnline ? onlineMode : gameMode;

    // Derived State
    const currentPlayer = isOnline
        ? onlinePlayers.find(p => p.id === myPlayerId)
        : getCurrentPlayer();

    const activePlayers = isOnline ? onlinePlayers : players.filter((p: any) => !p.isEliminated);
    const lastActiveIdx = isOnline ? 0 : players.map((p: any) => !p.isEliminated).lastIndexOf(true);
    const isLast = isOnline ? true : currentRevealIndex === lastActiveIdx;

    const activePlayerNumber = isOnline
        ? 1
        : (activePlayers.findIndex((p: any) => p.id === currentPlayer?.id) + 1);

    // Sync Revealed State
    useEffect(() => {
        if (roomDeleted) {
            leaveGame();
            router.replace('/');
        }
    }, [roomDeleted]);

    useEffect(() => {
        if (isOnline) {
            setHasRevealed(false); // Reset on mount
        } else {
            setHasRevealed(currentPlayer?.hasRevealed || false);
        }
    }, [isOnline, currentPlayer?.id, currentRevealIndex]);

    // Handle game start for online spectators
    useEffect(() => {
        if (isOnline && onlinePhase === 'discussion') {
            router.replace('/multiplayer/game');
        }
    }, [isOnline, onlinePhase]);

    // Block back navigation during role reveal
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

    const handleReveal = () => {
        if (isOnline) {
            setHasRevealed(true);
        } else if (currentPlayer) {
            revealRole(currentPlayer.id);
            setHasRevealed(true);
        }
    };

    const handleNext = async () => {
        haptics.medium();

        if (isOnline) {
            if (isHost) {
                haptics.gameStart();
                await GameAPI.updateGamePhase(roomCode!, 'discussion');
            }
            return;
        }

        if (isLast) {
            nextReveal();
            haptics.gameStart();

            // Special transitions for mixed modes
            if (activeMode === 'thief-police') {
                router.push('/discussion');
            } else {
                router.push('/first-player');
            }
        } else {
            setHasRevealed(false);
            nextReveal();
        }
    };

    const handleRefresh = () => {
        if (isOnline) {
            router.replace('/multiplayer/lobby');
        } else {
            refreshTheme();
            router.replace('/select-theme');
        }
    };

    if (!currentPlayer) return null;

    // Role Resolution
    let playerRole: any;
    if (isOnline) {
        const p = currentPlayer;
        playerRole = {
            isImposter: p.isImposter,
            word: p.secretWord,
            hint: '...', // Generic hint for online
            isDirector: p.role === 'director',
            movie: p.role === 'director' ? p.secretWord : null,
            isPolice: p.role === 'police',
            isThief: p.role === 'thief',
            isOutlier: p.role === 'outlier',
        };
        // Handle specific mode JSON parsing if needed
        if (activeMode === 'directors-cut' && p.role === 'director' && p.secretWord) {
            try {
                const data = JSON.parse(p.secretWord);
                playerRole.movie = data.title;
                playerRole.genre = data.genre;
            } catch (e) { }
        }
    } else {
        playerRole = getPlayerRole(currentPlayer.id);
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.progress}>
                <Text style={styles.progressText}>
                    {isOnline ? 'YOUR CASE FILE' : `Player ${activePlayerNumber} of ${activePlayers.length}`}
                </Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${isOnline ? 100 : (activePlayerNumber / activePlayers.length) * 100}%` }]} />
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
                    isPolice={playerRole.isPolice}
                    isThief={playerRole.isThief}
                    isFirstPlayer={isOnline ? false : (currentRevealIndex === players.findIndex((p: any) => !p.isEliminated))}
                    onRefresh={handleRefresh}
                />
            </View>

            {hasRevealed && (
                <View style={styles.footer}>
                    <View style={styles.passRow}>
                        <Ionicons name="hand-left-outline" size={14} color={Colors.candlelight} style={styles.passIcon} />
                        <Text style={styles.passText}>
                            {isOnline
                                ? (isHost ? 'Everyone viewing their files. Ready?' : 'Waiting for host to start...')
                                : (isLast ? 'Ready to begin investigation!' : 'Pass the case file to next investigator')
                            }
                        </Text>
                    </View>
                    {(isHost || !isOnline) && (
                        <Button
                            title={isLast || isOnline ? "Begin Investigation" : "Next Investigator"}
                            onPress={handleNext}
                            variant="primary"
                            size="large"
                            icon={
                                <Ionicons
                                    name={isLast || isOnline ? "search" : "arrow-forward"}
                                    size={18}
                                    color={Colors.victorianBlack}
                                />
                            }
                        />
                    )}
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
