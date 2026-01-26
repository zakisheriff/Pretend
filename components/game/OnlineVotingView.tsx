
import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function OnlineVotingView() {
    const { players, myPlayerId, roomCode, gameMode, isHost } = useOnlineGameStore();
    const [selected, setSelected] = useState<string | null>(null);
    const [hasVoted, setHasVoted] = useState(false);

    // Filter out myself from voting options (cannot vote for self usually, but standard impostor rules allow it? Local blocks it? 
    // Local flow is sequential, so "active player" votes for "others". 
    // Let's assume you can vote for anyone except yourself to avoid self-voting confusion.)
    const voteOptions = players.filter(p => p.id !== myPlayerId);

    const handleSelect = (id: string) => {
        if (hasVoted) return;
        haptics.light();
        setSelected(id);
    };

    const handleConfirmVote = async () => {
        if (!selected || !roomCode || !myPlayerId) return;
        haptics.medium();
        setHasVoted(true);

        const { GameAPI } = require('@/api/game');
        await GameAPI.castVote(myPlayerId, selected);
    };

    // Calculate progress
    const votedCount = players.filter(p => p.vote).length;
    const totalCount = players.length;

    const myVote = players.find(p => p.id === myPlayerId)?.vote;
    if (myVote && !hasVoted) {
        // Recover state if re-mounting
        setHasVoted(true);
        setSelected(myVote);
    }

    // Host Controls
    const handleForceEndVoting = async () => {
        if (!roomCode) return;
        const { GameAPI } = require('@/api/game');
        await GameAPI.updateGamePhase(roomCode, 'results');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="finger-print" size={32} color={Colors.suspect} />
                <Text style={styles.title}>Who is the Imposter?</Text>
                <Text style={styles.subtitle}>
                    {hasVoted ? "Waiting for others..." : "Cast your vote!"}
                </Text>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.list}>
                    {voteOptions.map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.option,
                                selected === p.id && styles.optionSelected,
                                hasVoted && selected !== p.id && { opacity: 0.5 }
                            ]}
                            onPress={() => handleSelect(p.id)}
                            disabled={hasVoted}
                        >
                            <View style={[styles.optAvatar, selected === p.id && styles.optAvatarSelected]}>
                                <Text style={[styles.optInitial, selected === p.id && styles.optInitialSelected]}>
                                    {p.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <Text style={[styles.optName, selected === p.id && styles.optNameSelected]}>{p.name}</Text>
                            {selected === p.id && <Ionicons name="checkmark-circle" size={22} color={Colors.parchment} />}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Status Footer */}
                <View style={styles.statusFooter}>
                    <Text style={styles.statusText}>
                        {votedCount} / {totalCount} Players Voted
                    </Text>
                    {/* Hosts can see a progress bar or button to force end */}
                </View>

                <View style={styles.footer}>
                    {!hasVoted ? (
                        <Button
                            title="Confirm Vote"
                            onPress={handleConfirmVote}
                            variant="primary"
                            size="large"
                            disabled={!selected}
                            icon={<Ionicons name="checkmark" size={18} color={selected ? Colors.victorianBlack : Colors.grayMedium} />}
                        />
                    ) : (
                        <View style={styles.waitingContainer}>
                            <Text style={styles.waitingText}>Vote Cast</Text>
                            {isHost && votedCount < totalCount && (
                                <TouchableOpacity onPress={handleForceEndVoting} style={{ marginTop: 10 }}>
                                    <Text style={{ color: Colors.grayLight, textDecorationLine: 'underline', fontSize: 12 }}>
                                        Force End Voting
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Host allow proceed if everyone voted */}
                    {isHost && votedCount >= totalCount && (
                        <Button
                            title="Show Results"
                            onPress={handleForceEndVoting}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="eye" size={18} color={Colors.victorianBlack} />}
                        />
                    )}
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, width: '100%' },
    header: { alignItems: 'center', paddingVertical: 20, gap: 6 },
    title: { fontSize: 20, fontWeight: '800', color: Colors.parchment, letterSpacing: 1 },
    subtitle: { fontSize: 13, color: Colors.candlelight },

    scroll: { flex: 1 },
    scrollContent: { padding: 20, alignItems: 'center' },
    list: { width: '100%', gap: 8, maxWidth: 360 },

    option: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayDark,
        borderRadius: 25, padding: 12, gap: 12, borderWidth: 1.5, borderColor: Colors.grayMedium
    },
    optionSelected: { borderColor: Colors.candlelight, backgroundColor: Colors.gray },

    optAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.gray, alignItems: 'center', justifyContent: 'center' },
    optAvatarSelected: { backgroundColor: Colors.parchmentLight },
    optInitial: { fontSize: 15, fontWeight: '700', color: Colors.parchmentLight },
    optInitialSelected: { color: Colors.victorianBlack },
    optName: { flex: 1, fontSize: 14, color: Colors.parchment, letterSpacing: 0.5 },
    optNameSelected: { color: Colors.parchment, fontWeight: '600' },

    footer: { width: '100%', maxWidth: 360, marginTop: 40, gap: 10 },

    statusFooter: { marginTop: 20 },
    statusText: { color: Colors.grayLight, fontSize: 12, textAlign: 'center' },

    waitingContainer: { alignItems: 'center', padding: 10 },
    waitingText: { color: Colors.parchment, fontSize: 16, fontWeight: 'bold' }
});
