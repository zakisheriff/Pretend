import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

const isAndroid = Platform.OS === 'android';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'danger';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    icon?: React.ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    hapticType?: 'light' | 'medium' | 'heavy';
}

export const Button: React.FC<ButtonProps> = ({
    title, onPress, variant = 'primary', size = 'medium',
    disabled = false, loading = false, icon, style, textStyle, hapticType = 'light',
}) => {
    const handlePress = () => {
        if (disabled || loading) return;
        haptics[hapticType]();
        onPress();
    };

    const isOutline = variant === 'outline';
    const isPrimary = variant === 'primary';

    return (
        <TouchableOpacity
            style={[
                styles.button,
                styles[`btn_${variant}`],
                styles[`btn_${size}`],
                disabled && styles.disabled,
                style,
            ]}
            onPress={handlePress}
            disabled={disabled || loading}
            activeOpacity={0.85}
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
        </TouchableOpacity>
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
    // Android gets smaller fonts
    text_small: { fontSize: isAndroid ? 11 : 12 },
    text_medium: { fontSize: isAndroid ? 12 : 14 },
    text_large: { fontSize: isAndroid ? 13 : 15 },
    textDisabled: { opacity: 0.5 },
});
