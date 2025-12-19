import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GameSettingProps {
    label: string;
    value: number;
    options: number[];
    onChange: (value: number) => void;
    icon: keyof typeof Ionicons.glyphMap;
    formatLabel?: (value: number) => string;
}

export const GameSetting: React.FC<GameSettingProps> = ({
    label,
    value,
    options,
    onChange,
    icon,
    formatLabel,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.labelRow}>
                    <Ionicons name={icon} size={16} color={Colors.grayLight} />
                    <Text style={styles.label}>{label}</Text>
                </View>
                <Text style={styles.currentValue}>
                    {formatLabel ? formatLabel(value) : value}
                </Text>
            </View>

            <View style={styles.optionsContainer}>
                {options.map((opt) => {
                    const isSelected = opt === value;
                    return (
                        <TouchableOpacity
                            key={opt}
                            style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                            onPress={() => onChange(opt)}
                        >
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                {formatLabel ? formatLabel(opt) : opt}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.grayDark,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.gray,
        gap: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.grayLight,
        letterSpacing: 2,
    },
    currentValue: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.white,
    },
    optionsContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.black,
        padding: 4,
        borderRadius: 12,
        gap: 4,
    },
    optionBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    optionBtnSelected: {
        backgroundColor: Colors.gray,
    },
    optionText: {
        fontSize: 14,
        color: Colors.grayMedium,
        fontWeight: '600',
    },
    optionTextSelected: {
        color: Colors.white,
        fontWeight: 'bold',
    },
});
