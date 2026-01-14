import { BackButton } from '@/components/common/BackButton';
import { GenericModal } from '@/components/common/GenericModal';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TimeBombVotingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const forceEndGame = useGameStore((s) => s.forceEndGame);

    // Filter out already eliminated players if we play multiple rounds where players are removed?
    // "whoeeve has the phone not answered will lose the game, ... they get 0 points others get 1 point"
    // Usually this implies point based, not player elimination.
    // So we show all players.
    const activePlayers = players.filter(p => !p.isEliminated);

    const [selectedLoserId, setSelectedLoserId] = useState<string | null>(null);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleSelect = (id: string) => {
        haptics.selection();
        setSelectedLoserId(id);
    };

    const handleConfirmRequest = () => {
        if (!selectedLoserId) return;
        haptics.warning();
        setShowConfirm(true);
    };

    const handleConfirmLoser = () => {
        if (!selectedLoserId) return;
        haptics.heavy();
        setShowConfirm(false);
        // End game with this player as the "eliminated" one
        forceEndGame(selectedLoserId);
        router.replace('/results');
    };

    const selectedPlayer = players.find(p => p.id === selectedLoserId);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
            >
                <BackButton />
            </LinearGradient>

            <View style={styles.header}>
                <Ionicons name="skull-outline" size={32} color={Colors.suspect} />
                <Text style={styles.title}>Who had the Bomb?</Text>
                <Text style={styles.subtitle}>Select the player holding the phone</Text>
            </View>

            <FlatList
                data={activePlayers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.playerCard,
                            selectedLoserId === item.id && styles.playerCardSelected
                        ]}
                        onPress={() => handleSelect(item.id)}
                        activeOpacity={0.8}
                    >
                        <View style={[
                            styles.avatar,
                            selectedLoserId === item.id && styles.avatarSelected
                        ]}>
                            <Text style={[
                                styles.avatarText,
                                selectedLoserId === item.id && styles.avatarTextSelected
                            ]}>
                                {item.name.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={[
                            styles.playerName,
                            selectedLoserId === item.id && styles.playerNameSelected
                        ]}>
                            {item.name}
                        </Text>
                        {selectedLoserId === item.id && (
                            <Ionicons name="skull" size={20} color={Colors.suspect} />
                        )}
                    </TouchableOpacity>
                )}
            />

            <View style={styles.footer}>
                <Button
                    title="Confirm Loser"
                    onPress={handleConfirmRequest}
                    variant="primary"
                    disabled={!selectedLoserId}
                    style={selectedLoserId ? { backgroundColor: Colors.suspect, borderColor: Colors.suspect } : {}}
                    icon={<Ionicons name="checkmark-circle-outline" size={20} color={Colors.parchment} />}
                />
            </View>

            <GenericModal
                visible={showConfirm}
                title="Confirm Loser"
                message={`Are you sure you want to mark ${selectedPlayer?.name} as the loser? They will get 0 points.`}
                confirmLabel="Confirm"
                isDestructive
                onConfirm={handleConfirmLoser}
                onCancel={() => setShowConfirm(false)}
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
        alignItems: 'center',
    },
    header: {
        marginTop: 80,
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: Colors.parchment,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: Colors.grayLight,
        textAlign: 'center',
    },

    listContent: {
        padding: 20,
        gap: 12,
    },
    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.grayDark,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        gap: 16,
    },
    playerCardSelected: {
        borderColor: Colors.suspect,
        backgroundColor: 'rgba(160, 32, 32, 0.15)',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.gray,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarSelected: {
        backgroundColor: Colors.suspect,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.parchment,
    },
    avatarTextSelected: {
        color: Colors.parchment,
    },
    playerName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: Colors.parchment,
    },
    playerNameSelected: {
        color: Colors.suspect,
    },

    footer: {
        padding: 20,
        paddingBottom: 40,
    },
});
