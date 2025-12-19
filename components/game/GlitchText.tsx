import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/typography';
import React, { useEffect } from 'react';
import { StyleSheet, Text, TextStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

interface GlitchTextProps {
    text: string;
    style?: TextStyle;
    glitchIntensity?: 'low' | 'medium' | 'high';
}

export const GlitchText: React.FC<GlitchTextProps> = ({
    text,
    style,
    glitchIntensity = 'medium',
}) => {
    const offsetX1 = useSharedValue(0);
    const offsetX2 = useSharedValue(0);
    const opacity1 = useSharedValue(0);
    const opacity2 = useSharedValue(0);
    const mainScale = useSharedValue(1);

    const intensityMap = {
        low: { offset: 2, delay: 3000 },
        medium: { offset: 4, delay: 2000 },
        high: { offset: 6, delay: 1000 },
    };

    const { offset, delay } = intensityMap[glitchIntensity];

    useEffect(() => {
        // Glitch animation
        const glitchSequence = () => {
            offsetX1.value = withRepeat(
                withDelay(
                    delay,
                    withSequence(
                        withTiming(-offset, { duration: 50 }),
                        withTiming(offset, { duration: 50 }),
                        withTiming(-offset / 2, { duration: 50 }),
                        withTiming(0, { duration: 50 })
                    )
                ),
                -1,
                false
            );

            offsetX2.value = withRepeat(
                withDelay(
                    delay + 100,
                    withSequence(
                        withTiming(offset, { duration: 50 }),
                        withTiming(-offset, { duration: 50 }),
                        withTiming(offset / 2, { duration: 50 }),
                        withTiming(0, { duration: 50 })
                    )
                ),
                -1,
                false
            );

            opacity1.value = withRepeat(
                withDelay(
                    delay,
                    withSequence(
                        withTiming(0.8, { duration: 50 }),
                        withTiming(0, { duration: 50 }),
                        withTiming(0.5, { duration: 50 }),
                        withTiming(0, { duration: 50 })
                    )
                ),
                -1,
                false
            );

            opacity2.value = withRepeat(
                withDelay(
                    delay + 100,
                    withSequence(
                        withTiming(0.6, { duration: 50 }),
                        withTiming(0, { duration: 50 }),
                        withTiming(0.4, { duration: 50 }),
                        withTiming(0, { duration: 50 })
                    )
                ),
                -1,
                false
            );

            mainScale.value = withRepeat(
                withDelay(
                    delay,
                    withSequence(
                        withTiming(1.02, { duration: 50 }),
                        withTiming(0.98, { duration: 50 }),
                        withTiming(1, { duration: 50 })
                    )
                ),
                -1,
                false
            );
        };

        glitchSequence();
    }, [delay, offset]);

    const mainStyle = useAnimatedStyle(() => ({
        transform: [{ scale: mainScale.value }],
    }));

    const glitch1Style = useAnimatedStyle(() => ({
        transform: [{ translateX: offsetX1.value }],
        opacity: opacity1.value,
    }));

    const glitch2Style = useAnimatedStyle(() => ({
        transform: [{ translateX: offsetX2.value }],
        opacity: opacity2.value,
    }));

    return (
        <Animated.View style={[styles.container, mainStyle]}>
            {/* Red glitch layer */}
            <Animated.Text
                style={[styles.glitchLayer, styles.redLayer, style, glitch1Style]}
            >
                {text}
            </Animated.Text>

            {/* Cyan glitch layer */}
            <Animated.Text
                style={[styles.glitchLayer, styles.cyanLayer, style, glitch2Style]}
            >
                {text}
            </Animated.Text>

            {/* Main text */}
            <Text style={[styles.mainText, style]}>{text}</Text>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    mainText: {
        color: Colors.white,
        fontSize: Typography.sizes.xxxl,
        fontWeight: Typography.weights.bold,
    },
    glitchLayer: {
        position: 'absolute',
        top: 0,
        left: 0,
    },
    redLayer: {
        color: Colors.danger,
    },
    cyanLayer: {
        color: '#00FFFF',
    },
});
