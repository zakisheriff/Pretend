import { Button, GameSetting } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GameSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const startGame = useGameStore((s) => s.startGame);

    // Calculate max imposters (approx 40% of players, max 3)
    const players = useGameStore((s) => s.players);
    const maxImposters = Math.min(3, Math.max(1, Math.floor(players.length * 0.4)));

    React.useEffect(() => {
        if (settings.imposterCount > maxImposters) {
            updateSettings({ imposterCount: maxImposters });
        }
    }, [maxImposters, settings.imposterCount]);

    const handleImposterChange = (v: number) => { haptics.selection(); updateSettings({ imposterCount: v }); };
    const handleTimeChange = (v: number) => { haptics.selection(); updateSettings({ discussionTime: v }); };

    const handleStart = () => { startGame(); haptics.heavy(); router.push('/role-reveal'); };

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
                    <Text style={styles.title}>SETTINGS</Text>
                    <Text style={styles.subtitle}>Customize your game  </Text>
                </View>

                <View style={styles.settingsGroup}>
                    <GameSetting
                        label="IMPOSTERS"
                        value={settings.imposterCount}
                        options={Array.from({ length: maxImposters }, (_, i) => i + 1)}
                        onChange={handleImposterChange}
                        icon="skull-outline"
                    />

                    <GameSetting
                        label="HINT STRENGTH"
                        value={['none', 'low', 'medium', 'high'].indexOf(settings.hintStrength)}
                        options={[0, 1, 2, 3]}
                        formatLabel={(v) => ['NONE', 'EASY', 'MEDIUM', 'HARD'][v]}
                        onChange={(v) => { haptics.selection(); updateSettings({ hintStrength: ['none', 'low', 'medium', 'high'][v] as any }); }}
                        icon="bulb-outline"
                    />

                    <GameSetting
                        label="TIME LIMIT"
                        value={settings.discussionTime}
                        options={[60, 120, 180, 240, 300]}
                        formatLabel={(v) => `${v / 60}m`}
                        onChange={handleTimeChange}
                        icon="timer-outline"
                    />
                </View>

                <View style={styles.footer}>
                    <Button
                        title="START GAME"
                        onPress={handleStart}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="play" size={18} color={Colors.black} />}
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
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 32 },
    header: { alignItems: 'center', gap: 4 },
    title: { fontSize: 24, fontWeight: '800', color: Colors.white, letterSpacing: 4 },
    subtitle: { fontSize: 13, color: Colors.grayLight, flexShrink: 0, paddingHorizontal: 4 },
    settingsGroup: { gap: 24, width: '100%', maxWidth: 400, alignSelf: 'center' },
    footer: { alignItems: 'center' },
});
