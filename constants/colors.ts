export const Colors = {
  // Primary palette
  black: '#000000',
  white: '#F5F5F5',
  pureWhite: '#FFFFFF',
  
  // Gray scale
  gray: '#333333',
  grayMedium: '#555555',
  grayLight: '#888888',
  grayDark: '#1A1A1A',
  
  // Shadows for neumorphism
  shadowLight: 'rgba(255, 255, 255, 0.08)',
  shadowDark: 'rgba(0, 0, 0, 0.8)',
  
  // Accent colors (subtle)
  danger: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  
  // Role colors
  imposter: '#FF3B30',
  crewmate: '#34C759',
};

export const Shadows = {
  neumorphicOuter: {
    shadowColor: Colors.pureWhite,
    shadowOffset: { width: -2, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  neumorphicInner: {
    shadowColor: Colors.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  card: {
    shadowColor: Colors.pureWhite,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};
