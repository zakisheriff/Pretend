export const Typography = {
    // Font families (system fonts)
    fontFamily: {
        regular: 'System',
        medium: 'System',
        bold: 'System',
    },

    // Font sizes
    sizes: {
        xs: 12,
        sm: 14,
        md: 16,
        lg: 18,
        xl: 22,
        xxl: 28,
        xxxl: 36,
        giant: 48,
        massive: 64,
    },

    // Font weights
    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        heavy: '800' as const,
    },

    // Line heights
    lineHeights: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
    },

    // Letter spacing (Victorian dramatic effect)
    letterSpacing: {
        tight: 0,
        normal: 0,
        wide: 2,
        wider: 4,
        widest: 6,
        mystery: 8,           // For dramatic titles like "THE CASE"
    },
};

export const Spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    xxxl: 64,
};

export const BorderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    round: 9999,
};
