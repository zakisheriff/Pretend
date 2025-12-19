import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StartGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [count, setCount] = useState(3);
    const [started, setStarted] = useState(false);
    const players = useGameStore((s) => s.players);
    const settings = useGameStore((s) => s.settings);

    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    useEffect(() => {
        const t = setTimeout(() => { setStarted(true); runCountdown(); }, 800);
        return () => clearTimeout(t);
    }, []);

    const runCountdown = () => {
        haptics.countdown();
        let c = 3;
        const interval = setInterval(() => {
            c--;
            if (c > 0) { setCount(c); haptics.countdown(); scale.value = withSequence(withTiming(1.2, { duration: 80 }), withTiming(1, { duration: 150 })); }
            else { setCount(0); haptics.gameStart(); scale.value = withTiming(1.5, { duration: 150 }); opacity.value = withDelay(200, withTiming(0, { duration: 200 })); setTimeout(() => router.replace('/discussion'), 400); clearInterval(interval); }
        }, 1000);
    };

    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

    const formatTime = (s: number) => { const m = Math.floor(s / 60); return m === 0 ? `${s}s` : `${m}m`; };

    if (started) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <View style={styles.center}>
                    <Animated.View style={[styles.countCircle, animStyle]}>
                        <Text style={styles.countText}>{count === 0 ? 'GO!' : count}</Text>
                    </Animated.View>
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.center}>
                <Ionicons name="search" size={28} color={Colors.white} />
                <Text style={styles.title}>INVESTIGATION</Text>
                <Text style={styles.subtitle}>Get ready to find the imposter</Text>
                <View style={styles.infoBox}>
                    <Text style={styles.infoText}>{players.length} players • {settings.imposterCount} imposter{settings.imposterCount > 1 ? 's' : ''} • {formatTime(settings.discussionTime)}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black, paddingHorizontal: 20 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    title: { fontSize: 24, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: Colors.grayLight },
    infoBox: { backgroundColor: Colors.grayDark, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: Colors.gray },
    infoText: { fontSize: 12, color: Colors.grayLight },
    countCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: Colors.grayDark, borderWidth: 3, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
    countText: { fontSize: 56, fontWeight: '800', color: Colors.white },
});
