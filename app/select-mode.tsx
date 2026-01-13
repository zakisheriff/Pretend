import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { GAME_MODES } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ModeCardProps {
    mode: typeof GAME_MODES[0];
    isSelected: boolean;
    onSelect: () => void;
    index: number;
}

function ModeCard({ mode, isSelected, onSelect, index }: ModeCardProps) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
            <TouchableOpacity
                style={[styles.modeCard, isSelected && styles.modeCardSelected]}
                onPress={onSelect}
                activeOpacity={0.8}
            >
                <View style={styles.modeIcon}>
                    <Ionicons name={mode.icon as any} size={28} color={Colors.parchment} />
                </View>
                <View style={styles.modeContent}>
                    <Text style={styles.modeName}>{mode.name}</Text>
                    <Text style={styles.modeDescription}>{mode.description}</Text>
                    <Text style={styles.modeTagline}>{mode.tagline}</Text>
                </View>
                <View style={[styles.modeRadio, isSelected && styles.modeRadioSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={16} color={Colors.victorianBlack} />}
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

    const handleContinue = () => {
        if (!gameMode) { haptics.warning(); return; }
        haptics.medium();
        router.push('/add-players');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.headerBar}>
                <BackButton />
                <Button
                    title="Next"
                    onPress={handleContinue}
                    variant="primary"
                    size="small"
                    disabled={!gameMode}
                    icon={<Ionicons name="arrow-forward" size={16} color={gameMode ? Colors.victorianBlack : Colors.grayMedium} />}
                    style={{ borderRadius: 22, height: 44, paddingHorizontal: 16 }}
                />
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Ionicons name="game-controller-outline" size={24} color={Colors.parchment} />
                        <Text style={styles.title}>Select Mode</Text>
                    </View>
                    <Text style={styles.subtitle}>Choose your investigation style</Text>
                </View>

                <View style={styles.modes}>
                    {GAME_MODES.map((mode, index) => (
                        <ModeCard
                            key={mode.id}
                            mode={mode}
                            isSelected={gameMode === mode.id}
                            onSelect={() => {
                                haptics.light();
                                selectGameMode(mode.id);
                            }}
                            index={index}
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
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20, paddingTop: 10, zIndex: 10
    },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.grayDark, borderWidth: 1, borderColor: Colors.grayMedium },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, padding: 20, gap: 24 },
    header: { alignItems: 'center', gap: 4 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    subtitle: { fontSize: 13, color: Colors.candlelight, fontStyle: 'italic' },

    modes: { gap: 16 },
    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.grayDark,
        borderRadius: 24,
        padding: 16,
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        gap: 14,
    },
    modeCardSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: 'rgba(196, 167, 108, 0.1)',
    },
    modeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: Colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeContent: { flex: 1, gap: 4 },
    modeName: { fontSize: 18, fontWeight: '700', color: Colors.parchment },
    modeDescription: { fontSize: 13, color: Colors.parchment, lineHeight: 18, opacity: 0.9 },
    modeTagline: { fontSize: 11, color: Colors.candlelight, fontStyle: 'italic', marginTop: 2 },
    modeRadio: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: Colors.candlelight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeRadioSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: Colors.candlelight,
    },

    footer: { alignItems: 'center', paddingTop: 10 },
});
