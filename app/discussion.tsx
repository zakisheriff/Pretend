import { Button, CircularTimer } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscussionScreen() {
    const router = useRouter();
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
                <Text style={styles.title}>{done ? "TIME'S UP" : 'THE INVESTIGATION'}</Text>
            </View>

            <View style={styles.timerArea}>
                <CircularTimer duration={settings.discussionTime} timeRemaining={time} size={220} strokeWidth={10} />
                {paused && !done && <View style={styles.pausedBadge}><Text style={styles.pausedText}>PAUSED</Text></View>}
            </View>

            {!done && (
                <View style={styles.controls}>
                    <Button title={paused ? 'RESUME' : 'PAUSE'} onPress={handlePause} variant="outline" size="large" style={{ flex: 1 }}
                        icon={<Ionicons name={paused ? "play" : "pause"} size={16} color={Colors.candlelight} />} />
                    <Button title="SKIP" onPress={handleSkip} variant="secondary" size="large" style={{ flex: 1 }}
                        icon={<Ionicons name="play-forward" size={16} color={Colors.parchment} />} />
                </View>
            )}

            {done && (
                <Button title={`FIND THE ${specialRoleName.toUpperCase()}`} onPress={handleVote} variant="primary" size="large"
                    icon={<Ionicons name="hand-left" size={18} color={Colors.victorianBlack} />} />
            )}

            <View style={styles.footerRow}>
                <Ionicons name="flame" size={14} color={Colors.candlelight} />
                <Text style={styles.footerText}>
                    {done
                        ? `Time to find the ${specialRoleName.toLowerCase()}!`
                        : gameMode === 'directors-cut'
                            ? 'Ask yes/no questions to guess the movie'
                            : gameMode === 'mind-sync'
                                ? 'Compare answers - find who is out of sync'
                                : gameMode === 'classic-imposter'
                                    ? 'Describe your word - spot who has a different one!'
                                    : 'Discuss and deduce who has a different word'
                    }
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, paddingHorizontal: 20, justifyContent: 'space-between' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
    headerEmoji: { fontSize: 20 },
    title: { fontSize: 20, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    timerArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    pausedBadge: { position: 'absolute', backgroundColor: 'rgba(26,20,16,0.9)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: Colors.candlelight },
    pausedText: { fontSize: 14, fontWeight: '800', color: Colors.gaslightAmber, letterSpacing: 3 },
    controls: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 },

    footerText: { fontSize: 12, color: Colors.candlelight, letterSpacing: 0.5 },
});
