import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const isAndroid = Platform.OS === 'android';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    textStyle?: TextStyle;
    hapticType?: 'light' | 'medium' | 'heavy';
}

export const Button: React.FC<ButtonProps> = ({
    title, onPress, variant = 'primary', size = 'medium',
    disabled = false, loading = false, icon, style, textStyle, hapticType = 'light',
}) => {
    const scale = useSharedValue(1);

    const handlePressIn = () => {
        if (disabled || loading) return;
        scale.value = withSpring(0.95, { damping: 10, stiffness: 300 });
    };

    const handlePressOut = () => {
        if (disabled || loading) return;
        scale.value = withSpring(1, { damping: 10, stiffness: 300 });
    };

    const handlePress = () => {
        if (disabled || loading) return;
        haptics[hapticType]();
        onPress();
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const isOutline = variant === 'outline';
    const isPrimary = variant === 'primary';

    return (
        <AnimatedPressable
            style={[
                styles.button,
                styles[`btn_${variant}`],
                styles[`btn_${size}`],
                disabled && styles.disabled,
                style,
                animatedStyle,
            ]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
        >
            {loading ? (
                <ActivityIndicator color={isOutline ? Colors.parchment : Colors.victorianBlack} size="small" />
            ) : (
                <View style={styles.content}>
                    {icon}
                    <Text style={[styles.text, styles[`text_${variant}`], styles[`text_${size}`], disabled && styles.textDisabled, textStyle]}>
                        {title}
                    </Text>
                </View>
            )}
        </AnimatedPressable>
    );
};

const styles = StyleSheet.create({
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        // Victorian brass border effect
        borderWidth: 1.5,
    },
    content: { flexDirection: 'row', alignItems: 'center', gap: isAndroid ? 8 : 10 },

    // Primary: Parchment background, mahogany text - like an aged letter
    btn_primary: {
        backgroundColor: Colors.parchment,
        borderColor: Colors.candlelight,
    },
    // Secondary: Dark leather button
    btn_secondary: {
        backgroundColor: Colors.gray,
        borderColor: Colors.grayMedium,
    },
    // Outline: Brass border like gaslight fixtures
    btn_outline: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: Colors.candlelight,
    },
    // Danger: Wax seal red
    btn_danger: {
        backgroundColor: Colors.waxSeal,
        borderColor: Colors.suspect,
    },
    // Ghost: Dark button like the Back Button
    btn_ghost: {
        backgroundColor: Colors.grayDark,
        borderColor: Colors.grayMedium,
        borderWidth: 1,
    },

    // Android gets smaller padding
    btn_small: {
        paddingVertical: isAndroid ? 8 : 10,
        paddingHorizontal: isAndroid ? 14 : 18,
        borderRadius: 20
    },
    btn_medium: {
        paddingVertical: isAndroid ? 10 : 14,
        paddingHorizontal: isAndroid ? 18 : 22,
        borderRadius: 24
    },
    btn_large: {
        paddingVertical: isAndroid ? 12 : 18,
        paddingHorizontal: isAndroid ? 20 : 24,
        borderRadius: 28
    },

    disabled: { opacity: 0.35 },

    text: { fontWeight: '700', letterSpacing: isAndroid ? 1 : 1.5 },
    text_primary: { color: Colors.victorianBlack },
    text_secondary: { color: Colors.parchment },
    text_outline: { color: Colors.candlelight },
    text_danger: { color: Colors.parchmentLight },
    text_ghost: { color: Colors.parchment },
    // Android gets smaller fonts
    text_small: { fontSize: isAndroid ? 11 : 12 },
    text_medium: { fontSize: isAndroid ? 12 : 14 },
    text_large: { fontSize: isAndroid ? 13 : 15 },
    textDisabled: { opacity: 0.5 },
});
