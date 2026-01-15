import { GenericModal } from '@/components/common/GenericModal';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { GAME_MODES } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModeCardProps {
    mode: typeof GAME_MODES[0];
    isSelected: boolean;
    onSelect: () => void;
    onShowHelp: (mode: typeof GAME_MODES[0]) => void;
    index: number;
}

function ModeCard({ mode, isSelected, onSelect, onShowHelp, index }: ModeCardProps) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(400)}>
            <TouchableOpacity
                style={[styles.modeCard, isSelected && styles.modeCardSelected]}
                onPress={onSelect}
                activeOpacity={0.8}
            >
                <View style={[styles.modeIcon, isSelected && styles.modeIconSelected]}>
                    <Ionicons name={mode.icon as any} size={24} color={isSelected ? Colors.victorianBlack : Colors.parchment} />
                </View>

                <View style={styles.modeContent}>
                    <Text style={[styles.modeName, isSelected && styles.modeNameSelected]}>{mode.name}</Text>
                </View>

                <TouchableOpacity
                    style={styles.helpBtn}
                    onPress={() => onShowHelp(mode)}
                    activeOpacity={0.6}
                >
                    <Ionicons name="help-circle-outline" size={20} color={Colors.candlelight} />
                </TouchableOpacity>

                <View style={[styles.modeRadio, isSelected && styles.modeRadioSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color={Colors.victorianBlack} />}
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

export default function SelectModeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gameMode = useGameStore((s) => s.gameMode);
    const selectGameMode = useGameStore((s) => s.selectGameMode);
    const [helpMode, setHelpMode] = React.useState<typeof GAME_MODES[0] | null>(null);
    const [showHomeAlert, setShowHomeAlert] = React.useState(false);

    const handleContinue = () => {
        if (!gameMode) { haptics.warning(); return; }
        haptics.medium();
        router.push('/add-players');
    };

    const handleHome = () => {
        haptics.selection();
        setShowHomeAlert(true);
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Ionicons name="game-controller-outline" size={24} color={Colors.parchment} />
                        <Text style={styles.title}>Select Mode</Text>
                    </View>
                    <Text style={styles.subtitle}>Choose Your Investigation Style</Text>
                </View>

                {/* Dynamic Player Count Sections */}
                {Array.from(new Set(GAME_MODES.map(m => m.minPlayers)))
                    .sort((a, b) => a - b) // Ensure ascending order
                    .map((minPlayers) => {
                        const icon = minPlayers === 2 ? 'copy-outline' : minPlayers === 3 ? 'layers-outline' : 'grid-outline';
                        const sectionModes = GAME_MODES.filter(m => m.minPlayers === minPlayers)
                            .sort((a, b) => a.name.localeCompare(b.name));

                        return (
                            <View key={minPlayers} style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Ionicons name={icon} size={18} color={Colors.candlelight} />
                                    <Text style={styles.sectionTitle}>{minPlayers}+ Players</Text>
                                </View>
                                <View style={styles.modes}>
                                    {sectionModes.map((mode, index) => (
                                        <ModeCard
                                            key={mode.id}
                                            mode={mode}
                                            isSelected={gameMode === mode.id}
                                            onSelect={() => {
                                                haptics.light();
                                                selectGameMode(mode.id);
                                            }}
                                            onShowHelp={(m) => {
                                                haptics.selection();
                                                setHelpMode(m);
                                            }}
                                            index={index + ((minPlayers - 2) * 2)} // Stagger animation slightly
                                        />
                                    ))}
                                </View>
                            </View>
                        );
                    })}

                {/* Instruction Overlay */}
                {helpMode && (
                    <View style={StyleSheet.absoluteFill}>
                        <TouchableOpacity
                            style={styles.overlayBg}
                            activeOpacity={1}
                            onPress={() => setHelpMode(null)}
                        />
                        <Animated.View
                            entering={FadeInDown.springify()}
                            style={[styles.infoCard, { bottom: insets.bottom + 100 }]}
                        >
                            <View style={styles.infoTitleRow}>
                                <Ionicons name={helpMode.icon as any} size={24} color={Colors.candlelight} />
                                <Text style={styles.infoTitle}>{helpMode.name}</Text>
                                <TouchableOpacity onPress={() => setHelpMode(null)} style={styles.infoClose}>
                                    <Ionicons name="close" size={20} color={Colors.parchment} />
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.infoTagline}>{helpMode.tagline}</Text>

                            <View style={styles.rulesList}>
                                {helpMode.instructions.map((step, i) => (
                                    <View key={i} style={styles.ruleItem}>
                                        <View style={styles.ruleIconBox}>
                                            <Ionicons name={step.icon as any} size={16} color={Colors.candlelight} />
                                        </View>
                                        <View style={styles.ruleText}>
                                            <Text style={styles.ruleRole}>{step.role}</Text>
                                            <Text style={styles.ruleDesc}>{step.desc}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity
                                style={styles.gotItBtn}
                                onPress={() => setHelpMode(null)}
                            >
                                <Text style={styles.gotItText}>Got it</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}

            </ScrollView>

            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10, justifyContent: 'space-between', paddingLeft: 20 }]}
                pointerEvents="box-none"
            >
                <Button
                    title=""
                    onPress={handleHome}
                    variant="ghost"
                    size="small"
                    icon={<Ionicons name="home-outline" size={20} color={Colors.parchment} />}
                    style={{ borderRadius: 22, height: 44, width: 44, paddingHorizontal: 0 }}
                />

                <Button
                    title="Next"
                    onPress={handleContinue}
                    variant="primary"
                    size="small"
                    disabled={!gameMode}
                    icon={<Ionicons name="arrow-forward" size={16} color={gameMode ? Colors.victorianBlack : Colors.grayMedium} />}
                    style={{ borderRadius: 22, height: 44, paddingHorizontal: 16 }}
                />
            </LinearGradient>

            <GenericModal
                visible={showHomeAlert}
                title="Return Home?"
                message="Are you sure you want to go back to the main menu?"
                confirmLabel="Yes"
                cancelLabel="No"
                onConfirm={() => {
                    setShowHomeAlert(false);
                    router.push('/');
                }}
                onCancel={() => setShowHomeAlert(false)}
                isDestructive
            />
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
    scrollContent: { flexGrow: 1, padding: 20, gap: 16 },
    header: { alignItems: 'center', gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    subtitle: { fontSize: 13, color: Colors.candlelight, fontStyle: 'italic' },

    modes: { gap: 12 },
    section: {
        gap: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.candlelight,
        letterSpacing: 1,
    },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.grayDark,
        borderRadius: 20,
        padding: 10,
        paddingRight: 14,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        gap: 12,
        height: 64,
    },
    modeCardSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: 'rgba(196, 167, 108, 0.08)',
    },
    modeIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeIconSelected: {
        backgroundColor: Colors.candlelight,
    },
    modeContent: { flex: 1 },
    modeName: { fontSize: 16, fontWeight: '700', color: Colors.parchment },
    modeNameSelected: { color: Colors.candlelight },

    helpBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
    },

    modeRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: Colors.candlelight,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.8,
    },
    modeRadioSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: Colors.candlelight,
        opacity: 1,
    },

    overlayBg: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.7)',
        zIndex: 100,
    },
    infoCard: {
        position: 'absolute',
        left: 20,
        right: 20,
        backgroundColor: Colors.grayDark,
        borderRadius: 28,
        padding: 24,
        zIndex: 101,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        gap: 16,
    },
    infoTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.parchment,
        flex: 1,
    },
    infoClose: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoTagline: {
        fontSize: 14,
        color: Colors.candlelight,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    rulesList: {
        gap: 14,
    },
    ruleItem: {
        flexDirection: 'row',
        gap: 14,
        alignItems: 'center',
    },
    ruleIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(196, 167, 108, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    ruleText: {
        flex: 1,
    },
    ruleRole: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.parchment,
    },
    ruleDesc: {
        fontSize: 12,
        color: Colors.parchment,
        opacity: 0.7,
        marginTop: 2,
    },
    gotItBtn: {
        backgroundColor: Colors.candlelight,
        borderRadius: 20,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    gotItText: {
        color: Colors.victorianBlack,
        fontWeight: '800',
        fontSize: 14,
    },
    footer: { alignItems: 'center', paddingTop: 10 },
});
