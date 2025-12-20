import { Button, PlayerCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 10;

export default function AddPlayersScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [name, setName] = useState('');
    const players = useGameStore((s) => s.players);
    const addPlayer = useGameStore((s) => s.addPlayer);
    const removePlayer = useGameStore((s) => s.removePlayer);
    const updatePlayerName = useGameStore((s) => s.updatePlayerName);

    const handleAdd = () => {
        const trimmedName = name.trim();
        if (!trimmedName || players.length >= MAX_PLAYERS) return;

        // Check for duplicate names (case-insensitive)
        const isDuplicate = players.some(
            p => p.name.toLowerCase() === trimmedName.toLowerCase()
        );

        if (isDuplicate) {
            haptics.warning();
            return;
        }

        haptics.light();
        addPlayer(trimmedName);
        setName('');
    };

    const handleContinue = () => {
        if (players.length < MIN_PLAYERS) { haptics.warning(); return; }
        haptics.medium();
        router.push('/select-theme');
    };

    const canContinue = players.length >= MIN_PLAYERS;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={Colors.parchment} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 20 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <View style={styles.titleRow}>
                        <Ionicons name="search" size={22} color={Colors.parchment} />
                        <Text style={styles.title}>INVESTIGATORS</Text>
                    </View>
                    <Text style={styles.count}>{players.length} / {MAX_PLAYERS}</Text>
                </View>

                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Investigator name"
                        placeholderTextColor={Colors.grayMedium}
                        autoCapitalize="words"
                        autoCorrect={false}
                        onSubmitEditing={handleAdd}
                        returnKeyType="go"
                        blurOnSubmit={false}
                        maxLength={16}
                    />
                    <TouchableOpacity
                        style={[styles.addBtn, !name.trim() && styles.addBtnDisabled]}
                        onPress={handleAdd}
                        disabled={!name.trim()}
                    >
                        <Ionicons name="add" size={22} color={Colors.victorianBlack} />
                    </TouchableOpacity>
                </View>

                <View style={styles.list}>
                    {players.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={48} color={Colors.candlelight} />
                            <Text style={styles.emptyText}>Gather at least {MIN_PLAYERS} investigators</Text>
                        </View>
                    ) : (
                        players.map((p, i) => (
                            <PlayerCard
                                key={p.id}
                                name={p.name}
                                index={i}
                                onDelete={() => removePlayer(p.id)}
                                onRename={(val) => updatePlayerName(p.id, val)}
                            />
                        ))
                    )}
                </View>

                <View style={styles.footer}>
                    {!canContinue && players.length > 0 && (
                        <Text style={styles.warn}>Need {MIN_PLAYERS - players.length} more investigator{MIN_PLAYERS - players.length > 1 ? 's' : ''}</Text>
                    )}
                    <Button
                        title="PROCEED TO CASE"
                        onPress={handleContinue}
                        variant="primary"
                        size="large"
                        disabled={!canContinue}
                        icon={<Ionicons name="arrow-forward" size={18} color={canContinue ? Colors.victorianBlack : Colors.grayMedium} />}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    headerBar: { paddingHorizontal: 20, zIndex: 10 },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.grayDark, borderWidth: 1, borderColor: Colors.grayMedium },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 26, paddingTop: 20 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    count: { fontSize: 13, color: Colors.candlelight, fontWeight: '600' },

    inputRow: { flexDirection: 'row', gap: 12 },
    input: {
        flex: 1,
        backgroundColor: Colors.grayDark,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: Colors.parchment,
        fontSize: 15,
        borderWidth: 1.5,
        borderColor: Colors.grayMedium,
    },
    addBtn: { width: 52, height: 52, backgroundColor: Colors.parchment, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    addBtnDisabled: { opacity: 0.35 },

    list: { gap: 14 },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 14 },
    emptyText: { fontSize: 14, color: Colors.candlelight, paddingHorizontal: 16, textAlign: 'center' },

    footer: { gap: 12, paddingTop: 10 },
    warn: { textAlign: 'center', color: Colors.gaslightAmber, fontSize: 13, fontWeight: '500' },
});
