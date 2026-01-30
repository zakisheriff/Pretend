import { BackButton } from '@/components/common/BackButton';
import { Button, ThemeCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { categories, undercoverCategories } from '@/data/themes';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SelectThemeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        gameMode,
        selectedThemeIds,
        toggleTheme,
        selectAllInCategory,
        deselectAll,
        customWords
    } = useGameStore();

    const isUndercoverMode = gameMode === 'classic-imposter';
    const displayCategories = isUndercoverMode ? undercoverCategories : categories;

    const handleContinue = () => {
        if (selectedThemeIds.length === 0) {
            haptics.warning();
            return;
        }
        haptics.medium();
        router.push('/game-settings');
    };

    const handleBack = () => {
        // Clear selection on back to avoid confusion if mode changes
        deselectAll();
        router.back();
    };

    // Helper to check if all themes in a category are selected
    const isCategoryFullSelected = (categoryId: string) => {
        const category = displayCategories.find((c) => c.id === categoryId);
        if (!category) return false;
        const themeIds = category.themes.map((t) => t.id);
        return themeIds.every((id) => selectedThemeIds.includes(id));
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
            >
                <BackButton onPress={handleBack} />
                <Button
                    title="Next"
                    onPress={handleContinue}
                    variant="primary"
                    size="small"
                    disabled={selectedThemeIds.length === 0}
                    icon={<Ionicons name="arrow-forward" size={16} color={selectedThemeIds.length > 0 ? Colors.victorianBlack : Colors.grayMedium} />}
                    style={{ borderRadius: 25, height: 44, paddingHorizontal: 16 }}
                />
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Ionicons name="folder-open-outline" size={24} color={Colors.parchment} />
                        <Text style={styles.title}>Case Files</Text>
                    </View>
                    <Text style={styles.subtitle}>Select one or more categories</Text>
                </View>

                {/* Custom Words Section Removed per user request */}
                {/* {!isUndercoverMode && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="create-outline" size={20} color={Colors.candlelight} />
                            <Text style={styles.sectionTitle}>Custom</Text>
                        </View>
                        <View style={styles.grid}>
                            <ThemeCard
                                id="custom"
                                name="Your Words"
                                icon="create-outline"
                                isSelected={selectedThemeIds.includes('custom')}
                                onSelect={() => toggleTheme('custom')}
                                description={`${customWords.length} words`}
                            />
                        </View>
                    </View>
                )} */}

                {displayCategories.map((cat) => {
                    const isFullSelected = isCategoryFullSelected(cat.id);

                    return (
                        <View key={cat.id} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Ionicons name={cat.icon as any} size={20} color={Colors.candlelight} />
                                    <Text style={styles.sectionTitle}>{cat.name}</Text>
                                </View>

                                <TouchableOpacity
                                    onPress={() => {
                                        haptics.selection();
                                        selectAllInCategory(cat.id);
                                    }}
                                    style={[styles.mixButton, isFullSelected && styles.mixButtonActive]}
                                >
                                    <Ionicons
                                        name={isFullSelected ? "checkmark-circle" : "copy-outline"}
                                        size={14}
                                        color={isFullSelected ? Colors.victorianBlack : Colors.parchment}
                                    />
                                    <Text style={[styles.mixButtonText, isFullSelected && styles.mixButtonTextActive]}>
                                        {isFullSelected ? "All" : "Select All"}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.grid}>
                                {cat.themes.map((t) => (
                                    <ThemeCard
                                        key={t.id}
                                        id={t.id}
                                        name={t.name}
                                        icon={t.icon}
                                        isSelected={selectedThemeIds.includes(t.id)}
                                        onSelect={() => toggleTheme(t.id)}
                                    />
                                ))}
                            </View>
                        </View>
                    );
                })}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 20, gap: 10, width: '100%', maxWidth: 500, alignSelf: 'center' },
    header: { alignItems: 'center', gap: 4, marginBottom: 20 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, fontFamily: 'Outfit-Bold', letterSpacing: 2 },
    subtitle: { fontSize: 13, color: Colors.candlelight, fontStyle: 'italic', fontFamily: 'Outfit-Regular' },

    section: { marginBottom: 24 },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingHorizontal: 4
    },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.parchment, fontFamily: 'Outfit-Bold', letterSpacing: 1, opacity: 0.9 },

    mixButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    mixButtonActive: {
        backgroundColor: Colors.parchment,
        borderColor: Colors.parchment,
    },
    mixButtonText: {
        fontSize: 12,
        fontFamily: 'Outfit-Medium',
        color: Colors.parchment,
    },
    mixButtonTextActive: {
        color: Colors.victorianBlack,
        fontWeight: 'bold',
    },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingBottom: 10 },
});
