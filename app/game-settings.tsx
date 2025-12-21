import { BackButton } from '@/components/common/BackButton';
import { Button, GameSetting } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GameSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const startGame = useGameStore((s) => s.startGame);

    const players = useGameStore((s) => s.players);
    const maxSuspects = Math.min(3, Math.max(1, Math.floor(players.length * 0.4)));

    React.useEffect(() => {
        if (settings.imposterCount > maxSuspects) {
            updateSettings({ imposterCount: maxSuspects });
        }
    }, [maxSuspects, settings.imposterCount]);

    const handleSuspectChange = (v: number) => { haptics.selection(); updateSettings({ imposterCount: v }); };
    const handleTimeChange = (v: number) => { haptics.selection(); updateSettings({ discussionTime: v }); };

    const handleStart = () => { startGame(); haptics.heavy(); router.push('/role-reveal'); };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.headerBar}>
                <BackButton />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Ionicons name="clipboard-outline" size={24} color={Colors.parchment} />
                        <Text style={styles.title}>CASE BRIEFING</Text>
                    </View>
                    <Text style={styles.subtitle}>Configure your investigation</Text>
                </View>

                <View style={styles.settingsGroup}>
                    <GameSetting
                        label="SUSPECTS"
                        value={settings.imposterCount}
                        options={Array.from({ length: maxSuspects }, (_, i) => i + 1)}
                        onChange={handleSuspectChange}
                        icon="skull-outline"
                    />

                    <GameSetting
                        label="CLUE STRENGTH"
                        value={['none', 'low', 'medium', 'high'].indexOf(settings.hintStrength)}
                        options={[0, 1, 2, 3]}
                        formatLabel={(v) => ['NONE', 'LOW', 'MEDIUM', 'HIGH'][v]}
                        onChange={(v) => { haptics.selection(); updateSettings({ hintStrength: ['none', 'low', 'medium', 'high'][v] as any }); }}
                        icon="bulb-outline"
                    />

                    <GameSetting
                        label="INVESTIGATION TIME"
                        value={settings.discussionTime}
                        options={[60, 120, 180, 240, 300]}
                        formatLabel={(v) => `${v / 60}m`}
                        onChange={handleTimeChange}
                        icon="timer-outline"
                    />
                </View>

                <View style={styles.footer}>
                    <Button
                        title="BEGIN CASE"
                        onPress={handleStart}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="search" size={18} color={Colors.victorianBlack} />}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    headerBar: { paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.grayDark, borderWidth: 1, borderColor: Colors.grayMedium },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 34 },
    header: { alignItems: 'center', gap: 6 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 24, fontWeight: '900', color: Colors.parchment, letterSpacing: 3 },
    subtitle: { fontSize: 13, color: Colors.candlelight, fontStyle: 'italic' },
    settingsGroup: { gap: 26, width: '100%', maxWidth: 400, alignSelf: 'center' },
    footer: { alignItems: 'center' },
});
