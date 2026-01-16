import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StartGameScreen() {
    useKeepAwake();
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [count, setCount] = useState(3);

    const scale = useSharedValue(1);
    const opacity = useSharedValue(1);

    // Block back navigation during countdown
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

    useEffect(() => {
        // Start countdown immediately - no delay, no intermediate screen
        haptics.countdown();
        let c = 3;
        const interval = setInterval(() => {
            c--;
            if (c > 0) {
                setCount(c);
                haptics.countdown();
                scale.value = withSequence(withTiming(1.2, { duration: 80 }), withTiming(1, { duration: 150 }));
            } else {
                setCount(0);
                haptics.gameStart();
                scale.value = withTiming(1.5, { duration: 150 });
                opacity.value = withDelay(200, withTiming(0, { duration: 200 }));
                setTimeout(() => router.replace('/discussion'), 400);
                clearInterval(interval);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

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

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, paddingHorizontal: 20 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    countCircle: { width: 150, height: 150, borderRadius: 75, backgroundColor: Colors.grayDark, borderWidth: 4, borderColor: Colors.candlelight, alignItems: 'center', justifyContent: 'center' },
    countText: { fontSize: 60, fontWeight: '900', color: Colors.parchment },
});
