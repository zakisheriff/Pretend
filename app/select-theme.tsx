import { BackButton } from '@/components/common/BackButton';
import { Button, ThemeCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { themes } from '@/data/themes';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
            >
                <BackButton />
                <Button
                    title="Next"
                    onPress={handleContinue}
                    variant="primary"
                    size="small"
                    disabled={!selectedThemeId}
                    icon={<Ionicons name="arrow-forward" size={16} color={selectedThemeId ? Colors.victorianBlack : Colors.grayMedium} />}
                    style={{ borderRadius: 22, height: 44, paddingHorizontal: 16 }}
                />
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Ionicons name="folder-open-outline" size={24} color={Colors.parchment} />
                        <Text style={styles.title}>Select Case File</Text>
                    </View>
                    <Text style={styles.subtitle}>Choose your evidence category</Text>
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
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.grayDark, borderWidth: 1, borderColor: Colors.grayMedium },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 100, gap: 26 },
    header: { alignItems: 'center', gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    subtitle: { fontSize: 13, color: Colors.candlelight, fontStyle: 'italic' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 14, paddingBottom: 40 },
});
