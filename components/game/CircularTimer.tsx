import { Colors } from '@/constants/colors';
import { Spacing, Typography } from '@/constants/typography';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface CircularTimerProps {
    duration: number; // in seconds
    timeRemaining: number; // in seconds
    size?: number;
    strokeWidth?: number;
}

export const CircularTimer: React.FC<CircularTimerProps> = ({
    duration,
    timeRemaining,
    size = 250,
    strokeWidth = 12,
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    const progress = useSharedValue(circumference);

    useEffect(() => {
        const targetProgress = circumference * (1 - timeRemaining / duration);
        progress.value = withTiming(targetProgress, {
            duration: 1000,
            easing: Easing.linear,
        });
    }, [timeRemaining, duration, circumference]);

    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: progress.value,
    }));

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const isLowTime = timeRemaining <= 10;
    const isCriticalTime = timeRemaining <= 5;

    return (
        <View style={[styles.container, { width: size, height: size }]}>
            <Svg width={size} height={size} style={styles.svg}>
                {/* Background circle - Victorian brass */}
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={Colors.grayMedium}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />

                {/* Progress circle - Gaslight colors */}
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={isCriticalTime ? Colors.suspect : isLowTime ? Colors.gaslightAmber : Colors.candlelight}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    animatedProps={animatedProps}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                />
            </Svg>

            <View style={styles.timeContainer}>
                <Text
                    style={[
                        styles.timeText,
                        isCriticalTime && styles.criticalText,
                        isLowTime && !isCriticalTime && styles.lowTimeText,
                    ]}
                >
                    {formatTime(timeRemaining)}
                </Text>
                <Text style={styles.label}>
                    {isCriticalTime ? 'TIME CRITICAL!' : isLowTime ? 'HURRY, DETECTIVE!' : 'INVESTIGATION TIME'}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    svg: {
        position: 'absolute',
    },
    timeContainer: {
        alignItems: 'center',
    },
    timeText: {
        fontSize: Typography.sizes.massive,
        fontWeight: Typography.weights.bold,
        color: Colors.parchment,
        fontVariant: ['tabular-nums'],
    },
    lowTimeText: {
        color: Colors.gaslightAmber,
    },
    criticalText: {
        color: Colors.suspect,
    },
    label: {
        fontSize: Typography.sizes.sm,
        fontWeight: Typography.weights.semibold,
        color: Colors.candlelight,
        marginTop: Spacing.sm,
    },
});
