import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface BackButtonProps {
    onPress?: () => void;
}

export const BackButton: React.FC<BackButtonProps> = ({ onPress }) => {
    const router = useRouter();
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const handlePress = () => {
        haptics.light();

        // Jiggle effect - quick scale bounce + subtle rotation
        scale.value = withSequence(
            withSpring(0.85, { damping: 10, stiffness: 400 }),
            withSpring(1.05, { damping: 8, stiffness: 300 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        rotation.value = withSequence(
            withSpring(-5, { damping: 10, stiffness: 400 }),
            withSpring(3, { damping: 10, stiffness: 400 }),
            withSpring(0, { damping: 10, stiffness: 400 })
        );

        // Navigate after animation starts
        setTimeout(() => {
            if (onPress) {
                onPress();
            } else if (router.canGoBack()) {
                router.back();
            } else {
                // Safety fallback: if no history, go to Home
                router.replace('/');
            }
        }, 100);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: scale.value },
            { rotate: `${rotation.value}deg` }
        ],
    }));

    return (
        <AnimatedPressable
            onPress={handlePress}
            style={[styles.button, animatedStyle]}
        >
            <Ionicons name="arrow-back" size={24} color={Colors.parchment} />
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 25,
        backgroundColor: Colors.grayDark,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
});
