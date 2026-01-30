import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const MAX_MOBILE_WIDTH = 500;
const SCREEN_WIDTH = Math.min(width, MAX_MOBILE_WIDTH);
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
    description?: string;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ id, name, icon, isSelected, onSelect, description }) => {
    const scale = useSharedValue(1);

    const handlePress = () => {
        haptics.medium();
        scale.value = withSpring(0.95, {}, () => { scale.value = withSpring(1); });
        onSelect();
    };

    const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
    const safeId = id || '';
    const iconId = safeId.startsWith('u-') ? safeId.substring(2) : safeId;
    const iconName = THEME_ICONS[iconId] || (icon ? (icon as keyof typeof Ionicons.glyphMap) : 'help-outline');

    return (
        <TouchableOpacity
            style={[styles.card, isSelected && styles.selectedCard]}
            onPress={() => {
                haptics.selection();
                onSelect();
            }}
            activeOpacity={0.7}
        >
            <View style={[styles.iconContainer, isSelected && styles.selectedIconContainer]}>
                <Ionicons
                    name={icon as any}
                    size={28}
                    color={isSelected ? Colors.victorianBlack : Colors.parchment}
                />
            </View>
            <Text style={[styles.name, isSelected && styles.selectedName]}>{name}</Text>
            {description && (
                <Text style={[styles.description, isSelected && styles.selectedDescription]}>
                    {description}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        width: '48%',
        aspectRatio: 1.1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    selectedCard: {
        backgroundColor: Colors.parchment,
        borderColor: Colors.parchment,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    selectedIconContainer: {
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    name: {
        fontSize: 15,
        fontFamily: 'Outfit-Medium',
        color: Colors.parchment,
        textAlign: 'center',
    },
    selectedName: {
        color: Colors.victorianBlack,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 11,
        fontFamily: 'Outfit-Regular',
        color: Colors.candlelight,
        textAlign: 'center',
        opacity: 0.8,
    },
    selectedDescription: {
        color: Colors.victorianBlack,
        opacity: 0.7,
    },
});
