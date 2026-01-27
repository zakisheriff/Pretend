
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function OnlineDirectorVerdictView() {
    const { players, roomCode, myPlayerId } = useOnlineGameStore();

    // Filter out the director (myself)
    const guessers = players.filter(p => p.id !== myPlayerId);

    const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSelectWinner = (id: string) => {
        if (loading) return;
        haptics.light();
        setSelectedWinner(id);
    };

    const handleConfirmWinner = async () => {
        if (!selectedWinner || !roomCode || loading) return;
        haptics.heavy();
        setLoading(true);

        const startTime = Date.now();
        try {
            // Call API
            const { GameAPI } = require('@/api/game');
            await GameAPI.setDirectorWinner(roomCode, selectedWinner);

            // Ensure minimum 500ms loading
            const elapsed = Date.now() - startTime;
            if (elapsed < 500) {
                await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
            }
        } finally {
            // We usually navigate away or modal closes, but safety:
            setLoading(false);
        }
    };

    const handleDirectorWins = async () => {
        if (!roomCode || loading) return;
        haptics.heavy();
        setLoading(true);

        const startTime = Date.now();
        try {
            // Call API with null winner
            const { GameAPI } = require('@/api/game');
            await GameAPI.setDirectorWinner(roomCode, null);

            // Ensure minimum 500ms loading
            const elapsed = Date.now() - startTime;
            if (elapsed < 500) {
                await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="trophy-outline" size={32} color={Colors.parchment} />
                <Text style={styles.title}>Who Guessed Correctly?</Text>
                <Text style={styles.subtitle}>Select the first person who got it right.</Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.grid}>
                    {guessers.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.card,
                                selectedWinner === p.id && styles.cardSelected
                            ]}
                            onPress={() => handleSelectWinner(p.id)}
                            activeOpacity={0.8}
                            disabled={loading}
                        >
                            <View style={[styles.avatar, selectedWinner === p.id && styles.avatarSelected]}>
                                <Text style={[styles.initial, selectedWinner === p.id && styles.initialSelected]}>
                                    {p.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.name, selectedWinner === p.id && styles.nameSelected]} numberOfLines={1}>
                                {p.name}
                            </Text>
                            {selectedWinner === p.id && (
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
                    title={selectedWinner ? `Winner: ${guessers.find(p => p.id === selectedWinner)?.name}` : 'Select a Winner'}
                    onPress={handleConfirmWinner}
                    variant="primary"
                    disabled={!selectedWinner || loading}
                    loading={loading}
                    size="large"
                    icon={<Ionicons name="trophy" size={20} color={Colors.victorianBlack} />}
                />

                <View style={styles.divider}>
                    <View style={styles.line} />
                    <Text style={styles.or}>or</Text>
                    <View style={styles.line} />
                </View>

                <Button
                    title="No One Guessed (Director Wins)"
                    onPress={handleDirectorWins}
                    variant="secondary"
                    size="large"
                    disabled={loading}
                    loading={loading}
                    icon={<Ionicons name="videocam" size={20} color={Colors.parchment} />}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, width: '100%' },
    header: { alignItems: 'center', paddingVertical: 20, gap: 6 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, letterSpacing: 1 },
    subtitle: { fontSize: 13, color: Colors.candlelight },

    scroll: { flex: 1 },
    scrollContent: { padding: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

    card: {
        width: '48%',
        backgroundColor: Colors.grayDark,
        borderRadius: 25,
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
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: Colors.gray, alignItems: 'center', justifyContent: 'center'
    },
    avatarSelected: {
        backgroundColor: Colors.parchment,
    },
    initial: { fontSize: 20, fontWeight: '700', color: Colors.parchmentLight },
    initialSelected: { color: Colors.victorianBlack },

    name: { fontSize: 15, color: Colors.parchment, fontWeight: '600' },
    nameSelected: { color: Colors.parchment },

    check: {
        position: 'absolute', top: 10, right: 10,
        width: 20, height: 20, borderRadius: 10,
        backgroundColor: Colors.candlelight,
        alignItems: 'center', justifyContent: 'center',
    },

    footer: { paddingHorizontal: 20, gap: 16, paddingBottom: 20 },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    line: { flex: 1, height: 1, backgroundColor: Colors.grayMedium },
    or: { color: Colors.grayLight, fontSize: 12, fontWeight: '700' },
});
