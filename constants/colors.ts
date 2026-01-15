// Neo Noir Theme - Color Palette
// Inspired by high contrast, shadows, and modern mystery

export const Colors = {
  // === Neo Noir Primary Palette ===
  victorianBlack: '#000000',      // True Black
  parchment: '#E5E5E5',           // Concrete White (Text)
  parchmentLight: '#FFFFFF',      // Pure White

  // Legacy aliases for compatibility
  black: '#000000',
  white: '#E5E5E5',
  pureWhite: '#FFFFFF',

  // === Urban Grays ===
  gray: '#171717',                // Dark Asphalt
  grayMedium: '#262626',          // Dark Gray
  grayLight: '#9CA3AF',           // Light Gray (Readable on dark)
  grayDark: '#0A0A0A',            // Deep Shadow

  // === Shadows & Glows ===
  shadowLight: 'rgba(255, 255, 255, 0.05)',
  shadowDark: 'rgba(0, 0, 0, 0.9)',

  // === Noir Accents ===
  gaslightAmber: '#F59E0B',       // Streetlight Amber (Accent)
  candlelight: '#E5E7EB',         // Moonlight Silver
  pureGold: '#FFD700',            // Vibrant Gold
  crownGold: '#D4AF37',           // Metallic Gold
  waxSeal: '#DC2626',             // Blood Red
  inkBlack: '#000000',

  // === Status Colors ===
  danger: '#EF4444',              // Bright Red
  success: '#10B981',             // Emerald
  warning: '#F59E0B',             // Amber

  // === Role Colors ===
  suspect: '#EF4444',             // Red
  detective: '#3B82F6',           // Blue (Police/detective feel)

  // Legacy role aliases
  imposter: '#EF4444',
  crewmate: '#3B82F6',
};

export const Shadows = {
  neumorphicOuter: {
    shadowColor: Colors.parchment,
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  neumorphicInner: {
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  gaslightGlow: {
    shadowColor: Colors.gaslightAmber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
};
