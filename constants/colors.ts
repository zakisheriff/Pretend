// Sherlock Holmes Victorian Theme - Color Palette
// Inspired by 221B Baker Street, gaslit London, and the art of deduction

export const Colors = {
  // === Victorian Era Primary Palette ===
  victorianBlack: '#1A1410',      // Deep mahogany black (main background)
  parchment: '#E8DCC4',           // Aged paper (primary light)
  parchmentLight: '#F5F0E6',      // Light parchment (pure white replacement)

  // Legacy aliases for compatibility
  black: '#1A1410',               // Maps to victorianBlack
  white: '#E8DCC4',               // Maps to parchment
  pureWhite: '#F5F0E6',           // Maps to parchmentLight

  // === Atmospheric Grays (London Fog) ===
  gray: '#3D2314',                // Rich mahogany
  grayMedium: '#5C4033',          // Worn leather
  grayLight: '#9A8567',           // Dusty brass
  grayDark: '#241A12',            // Deep shadow

  // === Shadows for Gaslight Effect ===
  shadowLight: 'rgba(232, 220, 196, 0.12)',  // Parchment glow
  shadowDark: 'rgba(26, 20, 16, 0.85)',      // Deep shadow

  // === Mystery Accents ===
  gaslightAmber: '#D4A84B',       // Warm gaslight glow
  candlelight: '#C4A76C',         // Candle flame
  waxSeal: '#8B0000',             // Dark wax seal red
  inkBlack: '#1A1410',            // Writing ink

  // === Status Colors (Victorian Styled) ===
  danger: '#A02020',              // Crimson (darker, more Victorian)
  success: '#6B8E23',             // Olive drab (period-appropriate green)
  warning: '#B8860B',             // Dark goldenrod

  // === Role Colors (The Game is Afoot!) ===
  suspect: '#A02020',             // Crimson red - menacing, dangerous
  detective: '#C4A76C',           // Brass gold - noble, observant

  // Legacy role aliases
  imposter: '#A02020',            // Maps to suspect
  crewmate: '#C4A76C',            // Maps to detective
};

export const Shadows = {
  neumorphicOuter: {
    shadowColor: Colors.parchment,
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  neumorphicInner: {
    shadowColor: Colors.victorianBlack,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 3,
  },
  card: {
    shadowColor: Colors.candlelight,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  // New: Gaslight glow effect
  gaslightGlow: {
    shadowColor: Colors.gaslightAmber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
};
