import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

interface AnimatedLogoProps {
    size?: number;
}

export const AnimatedLogo: React.FC<AnimatedLogoProps> = ({ size = 100 }) => {
    const scale = useSharedValue(1);
    const glowOpacity = useSharedValue(0.4);

    React.useEffect(() => {
        // Subtle breathing animation for gaslight effect
        scale.value = withRepeat(
            withSequence(
                withTiming(1.02, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        );
        // Flickering gaslight glow
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Gaslight glow effect */}
            <Animated.View style={[styles.glow, { width: size * 1.5, height: size * 1.5 }, glowStyle]} />

            {/* Main magnifying glass circle */}
            <Animated.View style={[styles.circle, { width: size, height: size, borderRadius: size / 2 }, pulseStyle]}>
                {/* Magnifying glass lens */}
                <View style={[styles.lens, {
                    width: size * 0.55,
                    height: size * 0.55,
                    borderRadius: size * 0.275,
                    borderWidth: size * 0.04,
                }]}>
                    {/* Mystery question mark in lens */}
                    <Text style={[styles.mystery, { fontSize: size * 0.25 }]}>?</Text>
                </View>

                {/* Magnifying glass handle */}
                <View style={[styles.handle, {
                    width: size * 0.12,
                    height: size * 0.35,
                    bottom: -size * 0.12,
                    right: size * 0.08,
                    borderRadius: size * 0.06,
                }]} />
            </Animated.View>

            {/* Decorative icon */}
            <View style={[styles.decorLeft, { left: size * 0.05, top: size * 0.5 }]}>
                <Ionicons name="eye" size={16} color={Colors.candlelight} style={{ opacity: 0.7 }} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        backgroundColor: Colors.gaslightAmber,
        borderRadius: 9999,
    },
    circle: {
        backgroundColor: Colors.grayDark,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: Colors.candlelight,
    },
    lens: {
        backgroundColor: 'rgba(232, 220, 196, 0.1)',
        borderColor: Colors.candlelight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    mystery: {
        color: Colors.parchment,
        fontWeight: '700',
        opacity: 0.7,
    },
    handle: {
        position: 'absolute',
        backgroundColor: Colors.candlelight,
        transform: [{ rotate: '45deg' }],
    },
    decorLeft: {
        position: 'absolute',
    },
});
