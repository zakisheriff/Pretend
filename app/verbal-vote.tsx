import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VerbalVoteScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const forceEndGame = useGameStore((s) => s.forceEndGame);
    const [selected, setSelected] = useState<string | null>(null);

    const handleSelect = (id: string) => {
        haptics.light();
        setSelected(id);
    };

    const handleConfirm = () => {
        if (!selected) return;
        haptics.heavy();

        // Force end the game with the selected player as the eliminated one
        forceEndGame(selected);
        router.push('/results');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
            <View style={[styles.headerBar, { top: insets.top + 10 }]}>
                <BackButton />
            </View>
            <View style={styles.header}>
                <Ionicons name="people" size={28} color={Colors.parchment} />
                <Text style={styles.title}>Group Decision</Text>
                <Text style={styles.subtitle}>Who does the group accuse?</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.grid}>
                    {players.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.card,
                                selected === p.id && styles.cardSelected
                            ]}
                            onPress={() => handleSelect(p.id)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.avatar, selected === p.id && styles.avatarSelected]}>
                                <Text style={styles.initial}>{p.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={[styles.name, selected === p.id && styles.nameSelected]} numberOfLines={1}>
                                {p.name}
                            </Text>
                            {selected === p.id && (
                                <View style={styles.check}>
                                    <Ionicons name="checkmark" size={14} color={Colors.victorianBlack} />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Eliminate Suspect"
                    onPress={handleConfirm}
                    variant="primary"
                    size="large"
                    disabled={!selected}
                    icon={<Ionicons name="skull" size={18} color={selected ? Colors.victorianBlack : Colors.grayMedium} />}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    headerBar: { position: 'absolute', left: 20, zIndex: 10 },
    header: { alignItems: 'center', paddingVertical: 20, gap: 6 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    subtitle: { fontSize: 14, color: Colors.candlelight },

    scroll: { flex: 1 },
    scrollContent: { padding: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

    card: {
        width: '48%',
        backgroundColor: Colors.grayDark,
        borderRadius: 24,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        gap: 12,
    },
    cardSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: 'rgba(230, 230, 230, 0.1)',
    },

    avatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarSelected: {
        backgroundColor: Colors.candlelight,
    },
    initial: { fontSize: 20, fontWeight: '700', color: Colors.parchment },

    name: { fontSize: 16, color: Colors.grayLight, fontWeight: '600' },
    nameSelected: { color: Colors.parchment },

    check: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: Colors.candlelight,
        alignItems: 'center',
        justifyContent: 'center',
    },

    footer: { paddingHorizontal: 20, paddingTop: 10 },
});
