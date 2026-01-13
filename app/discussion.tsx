import { Button, CircularTimer } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Helper to find director name safely
function findDirectorName(settings: any, mode: string, players: any[]) {
    // In directors-cut, the "imposter" is the Director
    const director = players.find(p => p.isImposter);
    return director ? director.name : 'Unknown';
}

export default function DiscussionScreen() {
    const router = useRouter();
    useKeepAwake(); // Keep screen on during discussion
    const insets = useSafeAreaInsets();
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const settings = useGameStore((s) => s.settings);
    const gameMode = useGameStore((s) => s.gameMode);
    const getModeDisplayInfo = useGameStore((s) => s.getModeDisplayInfo);
    const startVoting = useGameStore((s) => s.startVoting);
    const [time, setTime] = useState(settings.discussionTime);
    const [paused, setPaused] = useState(false);

    const { specialRoleName } = getModeDisplayInfo();

    // Block back navigation during discussion
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

    useEffect(() => {
        if (!paused && time > 0) {
            intervalRef.current = setInterval(() => {
                setTime((t) => {
                    if (t <= 1) { clearInterval(intervalRef.current!); haptics.success(); return 0; }
                    if (t === 11 || t === 6) haptics.warning();
                    else if (t <= 5) haptics.light();
                    return t - 1;
                });
            }, 1000);
        }
        return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }, [paused, time]);

    const handlePause = () => { haptics.medium(); setPaused(!paused); };
    const handleSkip = () => { haptics.medium(); if (intervalRef.current) clearInterval(intervalRef.current); setTime(0); };
    const handleVote = () => { haptics.heavy(); startVoting(); router.push('/vote-mode'); };

    const done = time === 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.header}>
                <Ionicons name={done ? "alarm" : "search"} size={22} color={Colors.parchment} />
                <Text style={styles.title}>{done ? "Time's Up" : 'The Investigation'}</Text>
            </View>

            {gameMode === 'directors-cut' && (
                <View style={styles.directorBadge}>
                    <Ionicons name="videocam" size={14} color={Colors.victorianBlack} />
                    <Text style={styles.directorText}>
                        Director: {findDirectorName(settings, gameMode, useGameStore.getState().players)}
                    </Text>
                </View>
            )}

            <View style={styles.timerArea}>
                <CircularTimer duration={settings.discussionTime} timeRemaining={time} size={220} strokeWidth={10} />
                {paused && !done && <View style={styles.pausedBadge}><Text style={styles.pausedText}>Paused</Text></View>}
            </View>

            {!done && (
                <View style={styles.controls}>
                    <Button title={paused ? 'Resume' : 'Pause'} onPress={handlePause} variant="outline" size="large" style={{ flex: 1 }}
                        icon={<Ionicons name={paused ? "play" : "pause"} size={16} color={Colors.candlelight} />} />
                    <Button title="Skip" onPress={handleSkip} variant="secondary" size="large" style={{ flex: 1 }}
                        icon={<Ionicons name="play-forward" size={16} color={Colors.parchment} />} />
                </View>
            )}

            {done && (
                gameMode === 'directors-cut' ? (
                    <Button
                        title="Declare Winner"
                        onPress={() => { haptics.heavy(); router.push('/director-verdict'); }}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="trophy" size={18} color={Colors.victorianBlack} />}
                    />
                ) : (
                    <Button title={`Find the ${specialRoleName}`} onPress={handleVote} variant="primary" size="large"
                        icon={<Ionicons name="hand-left" size={18} color={Colors.victorianBlack} />} />
                )
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, paddingHorizontal: 20, justifyContent: 'space-between' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center', marginTop: 20 },
    headerEmoji: { fontSize: 20 },
    title: { fontSize: 20, fontWeight: '800', color: Colors.parchmentLight, letterSpacing: 2 },
    timerArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    pausedBadge: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.9)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.candlelight },
    pausedText: { fontSize: 14, fontWeight: '800', color: Colors.gaslightAmber, letterSpacing: 3 },
    directorBadge: {
        alignSelf: 'center', backgroundColor: Colors.parchment, paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 20, marginTop: 10
    },
    directorText: { fontSize: 12, fontWeight: '800', color: Colors.victorianBlack },
    controls: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },

    footerText: { fontSize: 12, color: Colors.parchmentLight, letterSpacing: 0.5 },
});
