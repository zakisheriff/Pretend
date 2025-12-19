import { Button, ThemeCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { themes } from '@/data/themes';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SelectThemeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const selectedThemeId = useGameStore((s) => s.selectedThemeId);
    const selectTheme = useGameStore((s) => s.selectTheme);

    const handleContinue = () => {
        if (!selectedThemeId) { haptics.warning(); return; }
        haptics.medium();
        router.push('/game-settings');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>SELECT THEME</Text>
                    <Text style={styles.subtitle}>Choose a word category  </Text>
                </View>

                <View style={styles.grid}>
                    {themes.map((t) => (
                        <ThemeCard
                            key={t.id}
                            id={t.id}
                            name={t.name}
                            icon={t.icon}
                            isSelected={selectedThemeId === t.id}
                            onSelect={() => selectTheme(t.id)}
                        />
                    ))}
                </View>

                <View style={styles.footer}>
                    <Button
                        title="CONTINUE"
                        onPress={handleContinue}
                        variant="primary"
                        size="large"
                        disabled={!selectedThemeId}
                        icon={<Ionicons name="arrow-forward" size={18} color={selectedThemeId ? Colors.black : Colors.grayMedium} />}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black },
    headerBar: { paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: Colors.grayDark },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 24 },
    header: { alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
    subtitle: { fontSize: 13, color: Colors.grayLight, marginTop: 4, flexShrink: 0 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
    footer: { alignItems: 'center', paddingTop: 8 },
});
