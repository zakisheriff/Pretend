import { BackButton } from '@/components/common/BackButton';
import { GenericModal } from '@/components/common/GenericModal';
import { Button, PlayerCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
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
    const reorderPlayers = useGameStore((s) => s.reorderPlayers);

    // Dialog state
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Using any for the ref because strictly typing DraggableFlatList can be tricky with versions
    const listRef = useRef<any>(null);

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

    const gameMode = useGameStore((s) => s.gameMode);

    const handleContinue = () => {
        if (players.length < MIN_PLAYERS) { haptics.warning(); return; }
        haptics.medium();
        // These modes need theme selection
        if (gameMode === 'undercover-word' || gameMode === 'classic-imposter') {
            router.push('/select-theme');
        } else if (gameMode === 'directors-cut') {
            router.push('/setup-director');
        } else {
            router.push('/game-settings');
        }
    };

    const canContinue = players.length >= MIN_PLAYERS;
    const playerToDelete = players.find(p => p.id === deleteId);

    const handleDeleteConfirm = () => {
        if (deleteId) {
            haptics.medium();
            removePlayer(deleteId);
            setDeleteId(null);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.container}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <View style={[styles.headerBar, { paddingTop: insets.top + 10 }]}>
                <BackButton />
                <Button
                    title="Next"
                    onPress={handleContinue}
                    variant="primary"
                    size="small"
                    disabled={!canContinue}
                    icon={<Ionicons name="arrow-forward" size={16} color={canContinue ? Colors.victorianBlack : Colors.grayMedium} />}
                    style={{ borderRadius: 22, height: 44, paddingHorizontal: 16 }}
                />
            </View>

            <DraggableFlatList
                ref={listRef}
                data={players}
                onDragEnd={({ data }) => reorderPlayers(data)}
                keyExtractor={(item) => item.id}
                renderItem={({ item, drag, isActive, getIndex }) => (
                    <PlayerCard
                        id={item.id}
                        name={item.name}
                        index={getIndex() ?? 0}
                        onDelete={removePlayer}
                        onRename={updatePlayerName}
                        onRequestDeleteSignal={setDeleteId}
                        drag={drag}
                        isActive={isActive}
                        onFocus={() => {
                            const idx = getIndex();
                            if (idx !== undefined) {
                                setTimeout(() => {
                                    listRef.current?.scrollToIndex({ index: idx, viewPosition: 0.25, animated: false });
                                }, 100);
                            }
                        }}
                    />
                )}
                ListHeaderComponent={
                    <View style={styles.headerContent}>
                        <View style={styles.header}>
                            <View style={styles.titleRow}>
                                <Ionicons name="search" size={22} color={Colors.parchment} />
                                <Text style={styles.title}>Investigators</Text>
                            </View>
                            <Text style={styles.count}>{players.length} / {MAX_PLAYERS}</Text>
                        </View>
                        <View style={styles.tipContainer}>
                            <Ionicons name="information-circle-outline" size={16} color={Colors.candlelight} />
                            <Text style={styles.tipText}>
                                Tip: Add players in seating order (start from your right) for smoother phone passing.
                            </Text>
                        </View>

                        <View style={styles.inputRow}>
                            <TextInput
                                style={styles.input}
                                value={name}
                                onChangeText={setName}
                                placeholder="Investigator name"
                                placeholderTextColor={Colors.grayLight}
                                autoCapitalize="words"
                                autoCorrect={false}
                                onSubmitEditing={handleAdd}
                                returnKeyType="go"
                                blurOnSubmit={false}
                                maxLength={16}
                            />
                            <Button
                                title=""
                                onPress={handleAdd}
                                variant="primary"
                                disabled={!name.trim()}
                                icon={<Ionicons name="add" size={22} color={Colors.victorianBlack} />}
                                style={[styles.addBtn, !name.trim() && styles.addBtnDisabled]}
                                textStyle={{ display: 'none' }} // Hide text since title is empty but we want to be safe
                            />
                        </View>
                    </View>
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="people-outline" size={48} color={Colors.candlelight} />
                        <Text style={styles.emptyText}>Gather at least {MIN_PLAYERS} investigators</Text>
                    </View>
                }
                ListFooterComponent={
                    <View style={styles.footer}>
                        {!canContinue && players.length > 0 && (
                            <Text style={styles.warn}>Need {MIN_PLAYERS - players.length} more investigator{MIN_PLAYERS - players.length > 1 ? 's' : ''}</Text>
                        )}
                    </View>
                }
                containerStyle={styles.scroll}
                contentContainerStyle={[
                    styles.scrollContent,
                    { paddingBottom: insets.bottom + 350 }
                ]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="always"
                activationDistance={20}
            />

            <GenericModal
                visible={!!deleteId}
                title="Remove Investigator?"
                message={`Are you sure you want to remove ${playerToDelete?.name}?`}
                confirmLabel="Remove"
                isDestructive
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteId(null)}
            />
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    headerBar: { paddingHorizontal: 20, zIndex: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: Colors.grayDark, borderWidth: 1, borderColor: Colors.grayMedium },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 20 },
    headerContent: { gap: 26, marginBottom: 14 },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 22, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    count: { fontSize: 13, color: Colors.candlelight, fontWeight: '600' },

    tipContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -14, paddingHorizontal: 4 },
    tipText: { fontSize: 12, color: Colors.candlelight, fontStyle: 'italic', flex: 1, lineHeight: 16 },

    inputRow: { flexDirection: 'row', gap: 12 },
    input: {
        flex: 1,
        backgroundColor: Colors.grayDark,
        borderRadius: 25,
        height: 50,
        paddingHorizontal: 16,
        color: Colors.parchment,
        fontSize: 16,
        borderWidth: 1.5,
        borderColor: Colors.grayMedium,
    },
    addBtn: { width: 50, height: 50, borderRadius: 25, paddingHorizontal: 0, paddingVertical: 0 },
    addBtnDisabled: { opacity: 0.35 },

    list: { gap: 14 },
    empty: { alignItems: 'center', paddingVertical: 24, gap: 14 },
    emptyText: { fontSize: 14, color: Colors.candlelight, paddingHorizontal: 16, textAlign: 'center' },

    footer: { gap: 12, paddingTop: 10 },
    warn: { textAlign: 'center', color: Colors.gaslightAmber, fontSize: 13, fontWeight: '500' },
});
