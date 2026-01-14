import { BackButton } from '@/components/common/BackButton';
import { Button, GameSetting } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function GameSettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const settings = useGameStore((s) => s.settings);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const startGame = useGameStore((s) => s.startGame);
    const gameMode = useGameStore((s) => s.gameMode);
    const getModeDisplayInfo = useGameStore((s) => s.getModeDisplayInfo);
    const { specialRoleName, specialRoleIcon } = getModeDisplayInfo();

    const players = useGameStore((s) => s.players);
    const maxSuspects = Math.min(3, Math.max(1, Math.floor(players.length * 0.4)));

    React.useEffect(() => {
        if (settings.imposterCount > maxSuspects) {
            updateSettings({ imposterCount: maxSuspects });
        }
    }, [maxSuspects, settings.imposterCount]);

    const handleSuspectChange = (v: number) => { haptics.selection(); updateSettings({ imposterCount: v }); };
    const handleTimeChange = (v: number) => { haptics.selection(); updateSettings({ discussionTime: v }); };

    // Set default time for Time Bomb if not set correctly
    React.useEffect(() => {
        if (gameMode === 'time-bomb' && ![-1, 30, 60, 90].includes(settings.discussionTime)) {
            updateSettings({ discussionTime: 60 });
        }
    }, [gameMode]);

    const isRandomTime = settings.discussionTime === -1;

    const toggleRandomTime = (value: boolean) => {
        haptics.selection();
        if (value) {
            updateSettings({ discussionTime: -1 });
        } else {
            updateSettings({ discussionTime: 60 });
        }
    };

    const handleStart = () => {
        startGame();
        haptics.heavy();
        if (gameMode === 'time-bomb') {
            router.push('/time-bomb/game' as any);
        } else {
            router.push('/role-reveal' as any);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
            >
                <BackButton />
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }
                ]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Ionicons name="clipboard-outline" size={24} color={Colors.parchment} />
                        <Text style={styles.title}>Case Briefing</Text>
                    </View>
                    <Text style={styles.subtitle}>Configure your investigation</Text>
                </View>

                <View style={styles.settingsGroup}>
                    {gameMode !== 'time-bomb' && (
                        <GameSetting
                            label={specialRoleName + (specialRoleName.endsWith('s') ? '' : 's')}
                            value={settings.imposterCount}
                            options={Array.from({ length: maxSuspects }, (_, i) => i + 1)}
                            onChange={handleSuspectChange}
                            icon={specialRoleIcon + '-outline' as any}
                        />
                    )}

                    {gameMode === 'undercover-word' && (
                        <GameSetting
                            label="Clue Strength"
                            value={['none', 'low', 'medium', 'high'].indexOf(settings.hintStrength)}
                            options={[0, 1, 2, 3]}
                            formatLabel={(v) => ['None', 'Low', 'Medium', 'High'][v]}
                            onChange={(v) => { haptics.selection(); updateSettings({ hintStrength: ['none', 'low', 'medium', 'high'][v] as any }); }}
                            icon="bulb-outline"
                        />
                    )}

                    <GameSetting
                        label={gameMode === 'time-bomb' ? 'Timer Duration' : "Investigation Time"}
                        value={settings.discussionTime}
                        options={gameMode === 'time-bomb' ? [30, 60, 90] : [60, 120, 180, 240, 300]}
                        formatLabel={gameMode === 'time-bomb' ? ((v) => `${v}s`) : ((v) => `${v / 60}m`)}
                        onChange={handleTimeChange}
                        icon="timer-outline"
                    />

                    {gameMode === 'time-bomb' && (
                        <View style={styles.randomModeCard}>
                            <View style={styles.randomModeHeader}>
                                <View style={styles.randomModeTitleGroup}>
                                    <Ionicons name="sparkles" size={20} color={Colors.candlelight} />
                                    <Text style={styles.randomModeTitle}>Mystery Mode</Text>
                                </View>
                                <Switch
                                    value={isRandomTime}
                                    onValueChange={toggleRandomTime}
                                    trackColor={{ false: Colors.grayDark, true: Colors.candlelight }}
                                    thumbColor={isRandomTime ? Colors.victorianBlack : Colors.grayLight}
                                    ios_backgroundColor={Colors.grayDark}
                                />
                            </View>
                            <Text style={styles.randomModeDescription}>
                                A more fun mode! Selects a random timer (20-90s) and hides the countdown for extra suspense.
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.footer}>
                    <Button
                        title="Begin Case"
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
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 34 },
    header: { alignItems: 'center', gap: 6 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 24, fontWeight: '900', color: Colors.parchment, letterSpacing: 3 },
    subtitle: { fontSize: 13, color: Colors.candlelight, fontStyle: 'italic' },
    settingsGroup: { gap: 26, width: '100%', maxWidth: 400, alignSelf: 'center' },
    footer: { alignItems: 'center' },

    randomModeCard: {
        backgroundColor: Colors.grayDark,
        borderRadius: 16,
        padding: 16,
        gap: 10,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    randomModeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    randomModeTitleGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    randomModeTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.parchment,
    },
    randomModeDescription: {
        fontSize: 13,
        color: Colors.grayLight,
        lineHeight: 18,
    },
});
