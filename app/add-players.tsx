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
        if (!name.trim() || players.length >= MAX_PLAYERS) return;
        haptics.light();
        addPlayer(name);
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
                    <Ionicons name="arrow-back" size={24} color={Colors.white} />
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
                    <Text style={styles.title}>ADD PLAYERS</Text>
                    <Text style={styles.count}>{players.length} / {MAX_PLAYERS}  </Text>
                </View>

                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Player name"
                        placeholderTextColor={Colors.grayMedium}
                        autoCapitalize="words"
                        autoCorrect={false}
                        onSubmitEditing={handleAdd}
                        returnKeyType="done"
                        maxLength={16}
                    />
                    <TouchableOpacity
                        style={[styles.addBtn, !name.trim() && styles.addBtnDisabled]}
                        onPress={handleAdd}
                        disabled={!name.trim()}
                    >
                        <Ionicons name="add" size={22} color={Colors.black} />
                    </TouchableOpacity>
                </View>

                <View style={styles.list}>
                    {players.length === 0 ? (
                        <View style={styles.empty}>
                            <Ionicons name="people-outline" size={40} color={Colors.grayMedium} />
                            <Text style={styles.emptyText}>Add at least {MIN_PLAYERS} players </Text>
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
                        <Text style={styles.warn}>Add {MIN_PLAYERS - players.length} more</Text>
                    )}
                    <Button
                        title="CONTINUE"
                        onPress={handleContinue}
                        variant="primary"
                        size="large"
                        disabled={!canContinue}
                        icon={<Ionicons name="arrow-forward" size={18} color={canContinue ? Colors.black : Colors.grayMedium} />}
                    />
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black },
    headerBar: { paddingHorizontal: 20, zIndex: 10 },
    backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: Colors.grayDark },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, gap: 24, paddingTop: 20 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { fontSize: 22, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
    count: { fontSize: 13, color: Colors.grayLight },

    inputRow: { flexDirection: 'row', gap: 10 },
    input: { flex: 1, backgroundColor: Colors.grayDark, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.white, fontSize: 15, borderWidth: 1, borderColor: Colors.gray },
    addBtn: { width: 48, height: 48, backgroundColor: Colors.white, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    addBtnDisabled: { opacity: 0.4 },

    list: { gap: 12 },
    empty: { alignItems: 'center', paddingVertical: 20, gap: 12 },
    emptyText: { fontSize: 14, color: Colors.grayMedium, paddingHorizontal: 16, textAlign: 'center', flexShrink: 0 },

    footer: { gap: 10, paddingTop: 8 },
    warn: { textAlign: 'center', color: Colors.warning, fontSize: 12 },
});
