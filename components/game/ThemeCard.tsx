import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = (SCREEN_WIDTH - 64) / 2;

// Victorian themed icons for categories
const THEME_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
    'tamil-movies': 'film-outline',
    'hindi-movies': 'videocam-outline',
    'hollywood-movies': 'film-outline',
    'movies': 'videocam-outline',
    'celebrities': 'people-outline',
    'youtubers': 'logo-youtube',
    'actresses': 'person-outline',
    'actors': 'person-outline',
    'objects': 'cube-outline',
    'places': 'location-outline',
    'songs': 'musical-notes-outline',
    'foods': 'restaurant-outline',
    'lifestyle': 'cafe-outline',
    'festivals': 'sparkles-outline',
    'directors': 'videocam-outline',
    'fruits': 'nutrition-outline',
    'cars': 'car-sport-outline',
    'brands': 'pricetag-outline',
    'sports': 'football-outline',
    'animals': 'paw-outline',
    'general': 'grid-outline',
    'custom': 'create-outline',
};

interface ThemeCardProps {
    id: string;
    name: string;
    icon: string;
    isSelected: boolean;
    onSelect: () => void;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ id, name, isSelected, onSelect }) => {
    const scale = useSharedValue(1);

    const handlePress = () => {
        haptics.medium();
        scale.value = withSpring(0.95, {}, () => { scale.value = withSpring(1); });
        onSelect();
    };

    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const iconId = id.startsWith('u-') ? id.substring(2) : id;
    const iconName = THEME_ICONS[iconId] || 'help-outline';

    return (
        <TouchableOpacity onPress={handlePress} activeOpacity={0.9}>
            <Animated.View style={[styles.card, isSelected && styles.cardSelected, animatedStyle]}>
                <Ionicons name={iconName} size={28} color={isSelected ? Colors.victorianBlack : Colors.candlelight} />
                <Text style={[styles.name, isSelected && styles.nameSelected]}>{name}</Text>
                {isSelected && (
                    <View style={styles.check}>
                        <Ionicons name="checkmark" size={14} color={Colors.parchmentLight} />
                    </View>
                )}
            </Animated.View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: CARD_SIZE, height: CARD_SIZE * 0.7,
        backgroundColor: Colors.grayDark, borderRadius: 25,
        alignItems: 'center', justifyContent: 'center', gap: 10,
        borderWidth: 1, borderColor: Colors.grayMedium,
    },
    cardSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: Colors.parchment,
    },
    name: { fontSize: 13, fontWeight: '700', color: Colors.parchment, letterSpacing: 1 },
    nameSelected: { color: Colors.victorianBlack },
    check: {
        position: 'absolute', top: 8, right: 8,
        width: 22, height: 22, borderRadius: 11,
        backgroundColor: Colors.detective, alignItems: 'center', justifyContent: 'center',
    },
});
