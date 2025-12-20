import { Colors } from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/typography';
import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';

interface NeumorphicCardProps {
    children: React.ReactNode;
    style?: ViewStyle;
    variant?: 'raised' | 'inset' | 'flat';
    padding?: 'none' | 'small' | 'medium' | 'large';
}

export const NeumorphicCard: React.FC<NeumorphicCardProps> = ({
    children,
    style,
    variant = 'raised',
    padding = 'medium',
}) => {
    const cardStyles = [
        styles.card,
        styles[`card_${variant}`],
        styles[`padding_${padding}`],
        style,
    ];

    return (
        <View style={cardStyles}>
            {/* Victorian parchment edge effects */}
            {variant === 'raised' && (
                <>
                    <View style={styles.edgeTop} />
                    <View style={styles.edgeBottom} />
                </>
            )}
            <View style={styles.content}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.grayDark,
        borderRadius: BorderRadius.lg,
        position: 'relative',
        overflow: 'hidden',
        // Victorian border
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },

    // Variants - Victorian styled
    card_raised: {
        backgroundColor: Colors.grayDark,
        borderColor: Colors.candlelight,
        borderWidth: 1.5,
    },
    card_inset: {
        borderColor: Colors.gray,
        backgroundColor: Colors.victorianBlack,
    },
    card_flat: {
        backgroundColor: Colors.gray,
        borderColor: Colors.grayMedium,
    },

    // Padding
    padding_none: {
        padding: 0,
    },
    padding_small: {
        padding: Spacing.sm,
    },
    padding_medium: {
        padding: Spacing.md,
    },
    padding_large: {
        padding: Spacing.lg,
    },

    // Edge effects - like aged parchment
    edgeTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Colors.candlelight,
        opacity: 0.2,
    },
    edgeBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Colors.victorianBlack,
        opacity: 0.6,
    },

    content: {
        position: 'relative',
        zIndex: 1,
    },
});
