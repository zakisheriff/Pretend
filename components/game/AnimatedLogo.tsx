import { Colors } from '@/constants/colors';
import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
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
        // Flickering gaslight glow - adjusted to silver/white for Neo Noir
        glowOpacity.value = withRepeat(
            withSequence(
                withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.2, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
                withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
            ), -1, true
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const glowStyle = useAnimatedStyle(() => ({ opacity: glowOpacity.value }));

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            {/* Gaslight glow effect - updated to pure white for neo noir */}
            <Animated.View style={[styles.glow, { width: size * 1.3, height: size * 1.3, backgroundColor: '#FFFFFF' }, glowStyle]} />

            {/* Main logo image */}
            <Animated.View style={[styles.logoContainer, { width: size, height: size, borderRadius: size / 2 }, pulseStyle]}>
                <Image
                    source={require('@/assets/images/Neo-Logo.jpeg')}
                    style={[styles.logo, { width: size * 1.1, height: size * 1.1, borderRadius: size / 2 }]}
                    resizeMode="cover"
                />
            </Animated.View>
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
        backgroundColor: Colors.grayMedium,
        borderRadius: 9999,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logo: {
        // No border - logo fills the entire circle
    },
});

