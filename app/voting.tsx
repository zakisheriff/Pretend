import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VotingScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const phase = useGameStore((s) => s.phase);
    const castVote = useGameStore((s) => s.castVote);
    const endGame = useGameStore((s) => s.endGame);
    const [voterIdx, setVoterIdx] = useState(0);
    const [selected, setSelected] = useState<string | null>(null);
    const [showVoter, setShowVoter] = useState(true);

    const voter = players[voterIdx];
    const isLast = voterIdx === players.length - 1;

    // Block back navigation during voting
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

    const handleTapVote = () => { haptics.medium(); setShowVoter(false); };
    const handleSelect = (id: string) => { haptics.light(); setSelected(id); };
    const handleConfirm = () => {
        if (!selected || !voter) return;
        haptics.medium();
        castVote(voter.id, selected);
        if (isLast) { endGame(); router.push('/results'); }
        else { setVoterIdx(voterIdx + 1); setSelected(null); setShowVoter(true); }
    };

    if (showVoter) {
        return (
            <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
                <View style={[styles.centeredContent]}>
                    <Text style={styles.voterLabel}>ACCUSATION {voterIdx + 1} / {players.length}</Text>
                    <View style={styles.voterAvatar}>
                        <Text style={styles.voterInitial}>{voter?.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.voterName}>{voter?.name}</Text>
                    <Button
                        title="MAKE YOUR ACCUSATION"
                        onPress={handleTapVote}
                        variant="primary"
                        size="large"
                        style={{ marginTop: 24 }}
                        icon={<Ionicons name="hand-left" size={18} color={Colors.victorianBlack} />}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Ionicons name="skull-outline" size={24} color={Colors.suspect} />
                    <Text style={styles.title}>Who is the suspect?</Text>
                    <Text style={styles.subtitle}>{voter?.name}'s accusation</Text>
                </View>

                <View style={styles.list}>
                    {players.filter((p) => p.id !== voter?.id).map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.option, selected === p.id && styles.optionSelected]}
                            onPress={() => handleSelect(p.id)}
                        >
                            <View style={[styles.optAvatar, selected === p.id && styles.optAvatarSelected]}>
                                <Text style={styles.optInitial}>{p.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={[styles.optName, selected === p.id && styles.optNameSelected]}>{p.name}</Text>
                            {selected === p.id && <Ionicons name="checkmark-circle" size={22} color={Colors.parchment} />}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Button
                        title="CONFIRM ACCUSATION"
                        onPress={handleConfirm}
                        variant="primary"
                        size="large"
                        disabled={!selected}
                        icon={<Ionicons name="checkmark" size={18} color={selected ? Colors.victorianBlack : Colors.grayMedium} />}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    voterLabel: { fontSize: 10, color: Colors.candlelight, letterSpacing: 2, marginBottom: 14, fontWeight: '600' },
    voterAvatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.waxSeal, borderWidth: 2.5, borderColor: Colors.suspect, alignItems: 'center', justifyContent: 'center' },
    voterInitial: { fontSize: 28, fontWeight: '700', color: Colors.parchmentLight },
    voterName: { fontSize: 20, fontWeight: '700', color: Colors.parchment, marginTop: 12, letterSpacing: 1 },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 18, gap: 20 },

    header: { alignItems: 'center', gap: 3 },
    headerEmoji: { fontSize: 20, marginBottom: 6 },
    title: { fontSize: 17, fontWeight: '800', color: Colors.parchment, letterSpacing: 1 },
    subtitle: { fontSize: 11, color: Colors.candlelight, fontStyle: 'italic' },

    list: { width: '100%', gap: 8, maxWidth: 360, alignSelf: 'center' },

    option: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayDark, borderRadius: 12, padding: 12, gap: 12, borderWidth: 1.5, borderColor: Colors.grayMedium },
    optionSelected: { borderColor: Colors.candlelight, backgroundColor: Colors.gray },
    optAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.gray, alignItems: 'center', justifyContent: 'center' },
    optAvatarSelected: { backgroundColor: Colors.waxSeal },
    optInitial: { fontSize: 15, fontWeight: '700', color: Colors.parchmentLight },
    optName: { flex: 1, fontSize: 14, color: Colors.grayLight, letterSpacing: 0.5 },
    optNameSelected: { color: Colors.parchment, fontWeight: '600' },

    footer: { alignItems: 'center', paddingTop: 8 },
});
