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
            {variant === 'raised' && (
                <>
                    <View style={styles.shadowTop} />
                    <View style={styles.shadowBottom} />
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
    },

    // Variants
    card_raised: {
        borderWidth: 1,
        borderColor: Colors.shadowLight,
    },
    card_inset: {
        borderWidth: 1,
        borderColor: Colors.shadowDark,
        backgroundColor: Colors.black,
    },
    card_flat: {
        backgroundColor: Colors.gray,
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

    // Shadow elements for 3D effect
    shadowTop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Colors.shadowLight,
        opacity: 0.3,
    },
    shadowBottom: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 2,
        backgroundColor: Colors.shadowDark,
        opacity: 0.5,
    },

    content: {
        position: 'relative',
        zIndex: 1,
    },
});
