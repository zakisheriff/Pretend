import { Colors } from '@/constants/colors';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

interface AnimatedLogoProps {
    size?: number;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 100 }) => {
    const scale = useSharedValue(1);
    const opacity = useSharedValue(0.6);

    React.useEffect(() => {
        scale.value = withRepeat(
            withSequence(
                withTiming(1.03, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        );
        opacity.value = withRepeat(
            withSequence(
                withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const glowStyle = useAnimatedStyle(() => ({ opacity: opacity.value * 0.2 }));

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Animated.View style={[styles.glow, { width: size * 1.3, height: size * 1.3 }, glowStyle]} />
            <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, pulseStyle]}>
                <View style={[styles.eye, { width: size * 0.6, height: size * 0.25, borderRadius: size * 0.125 }]}>
                    <View style={[styles.pupil, { width: size * 0.15, height: size * 0.15, borderRadius: size * 0.075 }]} />
                </View>
                <Text style={[styles.question, { fontSize: size * 0.2 }]}>?</Text>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { alignItems: 'center', justifyContent: 'center' },
    glow: { position: 'absolute', backgroundColor: Colors.white, borderRadius: 9999 },
    circle: {
        backgroundColor: Colors.grayDark, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Colors.grayLight,
    },
    eye: { backgroundColor: Colors.black, borderWidth: 1.5, borderColor: Colors.grayLight, alignItems: 'center', justifyContent: 'center' },
    pupil: { backgroundColor: Colors.white },
    question: { position: 'absolute', bottom: 8, right: 12, color: Colors.grayLight, fontWeight: '700', opacity: 0.4 },
});
