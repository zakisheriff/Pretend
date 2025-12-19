import { Button, CircularTimer } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DiscussionScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const settings = useGameStore((s) => s.settings);
    const phase = useGameStore((s) => s.phase);
    const startVoting = useGameStore((s) => s.startVoting);
    const [time, setTime] = useState(settings.discussionTime);
    const [paused, setPaused] = useState(false);

    // Guard removed

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
    const handleVote = () => { haptics.heavy(); startVoting(); router.push('/voting'); };

    const done = time === 0;

    return (
        <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.header}>
                <Ionicons name={done ? "alarm" : "chatbubbles"} size={20} color={Colors.white} />
                <Text style={styles.title}>{done ? "TIME'S UP" : 'DISCUSSION'}</Text>
            </View>

            <View style={styles.timerArea}>
                <CircularTimer duration={settings.discussionTime} timeRemaining={time} size={220} strokeWidth={10} />
                {paused && !done && <View style={styles.pausedBadge}><Text style={styles.pausedText}>PAUSED</Text></View>}
            </View>

            {!done && (
                <View style={styles.controls}>
                    <Button title={paused ? 'RESUME' : 'PAUSE'} onPress={handlePause} variant="outline" size="medium" style={{ flex: 1 }}
                        icon={<Ionicons name={paused ? "play" : "pause"} size={16} color={Colors.white} />} />
                    <Button title="SKIP" onPress={handleSkip} variant="secondary" size="medium" style={{ flex: 1 }}
                        icon={<Ionicons name="play-forward" size={16} color={Colors.white} />} />
                </View>
            )}

            {done && (
                <Button title="START VOTING" onPress={handleVote} variant="primary" size="large"
                    icon={<Ionicons name="checkbox" size={18} color={Colors.black} />} />
            )}

            <View style={styles.footerRow}>
                <Ionicons name="phone-portrait-outline" size={12} color={Colors.grayMedium} />
                <Text style={styles.footerText}>{done ? 'Everyone vote now' : 'Place phone in center'}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black, paddingHorizontal: 20, justifyContent: 'space-between' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
    title: { fontSize: 20, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
    timerArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    pausedBadge: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
    pausedText: { fontSize: 14, fontWeight: '700', color: Colors.warning, letterSpacing: 2 },
    controls: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    footerText: { fontSize: 11, color: Colors.grayMedium, fontStyle: 'italic' },
});
