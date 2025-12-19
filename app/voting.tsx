import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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



    // Phase guard removed to prevent navigation bugs

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
                    <Text style={styles.voterLabel}>VOTER {voterIdx + 1} / {players.length}  </Text>
                    <View style={styles.voterAvatar}>
                        <Text style={styles.voterInitial}>{voter?.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={styles.voterName}>{voter?.name}</Text>
                    <Button
                        title="TAP TO VOTE"
                        onPress={handleTapVote}
                        variant="primary"
                        size="large"
                        style={{ marginTop: 24 }}
                        icon={<Ionicons name="checkbox-outline" size={18} color={Colors.black} />}
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
                    <Text style={styles.title}>Who is the imposter?</Text>
                    <Text style={styles.subtitle}>{voter?.name}'s vote</Text>
                </View>

                <View style={styles.list}>
                    {players.filter((p) => p.id !== voter?.id).map((p) => (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.option, selected === p.id && styles.optionSelected]}
                            onPress={() => handleSelect(p.id)}
                        >
                            <View style={styles.optAvatar}>
                                <Text style={styles.optInitial}>{p.name.charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={[styles.optName, selected === p.id && styles.optNameSelected]}>{p.name}</Text>
                            {selected === p.id && <Ionicons name="checkmark-circle" size={20} color={Colors.white} />}
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.footer}>
                    <Button
                        title="CONFIRM"
                        onPress={handleConfirm}
                        variant="primary"
                        size="large"
                        disabled={!selected}
                        icon={<Ionicons name="checkmark" size={18} color={selected ? Colors.black : Colors.grayMedium} />}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black },
    centeredContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    voterLabel: { fontSize: 11, color: Colors.grayLight, letterSpacing: 2, marginBottom: 16, flexShrink: 0 },
    voterAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.grayDark, borderWidth: 2, borderColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
    voterInitial: { fontSize: 32, fontWeight: '700', color: Colors.white },
    voterName: { fontSize: 22, fontWeight: '700', color: Colors.white, marginTop: 12 },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, gap: 24 },

    header: { alignItems: 'center' },
    title: { fontSize: 18, fontWeight: '700', color: Colors.white },
    subtitle: { fontSize: 12, color: Colors.grayLight, marginTop: 4 },

    list: { width: '100%', gap: 8, maxWidth: 400, alignSelf: 'center' },

    option: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grayDark, borderRadius: 12, padding: 12, gap: 12, borderWidth: 1.5, borderColor: Colors.gray },
    optionSelected: { borderColor: Colors.white, backgroundColor: Colors.gray },
    optAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.gray, alignItems: 'center', justifyContent: 'center' },
    optInitial: { fontSize: 16, fontWeight: '700', color: Colors.white },
    optName: { flex: 1, fontSize: 15, color: Colors.grayLight },
    optNameSelected: { color: Colors.white, fontWeight: '600' },

    footer: { alignItems: 'center', paddingTop: 8 },
});
