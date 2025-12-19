import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextStyle, TouchableOpacity, View, ViewStyle } from 'react-native';

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
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator color={isOutline ? Colors.white : Colors.black} size="small" />
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
    button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
    content: { flexDirection: 'row', alignItems: 'center', gap: 8 },

    btn_primary: { backgroundColor: Colors.white },
    btn_secondary: { backgroundColor: Colors.gray },
    btn_outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.grayLight },
    btn_danger: { backgroundColor: Colors.danger },

    btn_small: { paddingVertical: 8, paddingHorizontal: 14 },
    btn_medium: { paddingVertical: 12, paddingHorizontal: 20 },
    btn_large: { paddingVertical: 14, paddingHorizontal: 24 },

    disabled: { opacity: 0.4 },

    text: { fontWeight: '600', letterSpacing: 0.5 },
    text_primary: { color: Colors.black },
    text_secondary: { color: Colors.white },
    text_outline: { color: Colors.white },
    text_danger: { color: Colors.white },
    text_small: { fontSize: 12 },
    text_medium: { fontSize: 14 },
    text_large: { fontSize: 15 },
    textDisabled: { opacity: 0.6 },
});
