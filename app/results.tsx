import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResultsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const selectedWord = useGameStore((s) => s.selectedWord);
    const impostersCaught = useGameStore((s) => s.impostersCaught);
    const getVoteResults = useGameStore((s) => s.getVoteResults);
    const resetGame = useGameStore((s) => s.resetGame);
    const resetToHome = useGameStore((s) => s.resetToHome);

    const voteResults = getVoteResults();
    const suspects = players.filter((p) => p.isImposter);

    useEffect(() => { haptics.success(); }, []);

    const handleAgain = () => { haptics.medium(); resetGame(); router.push('/add-players'); };
    const handleHome = () => { haptics.medium(); resetToHome(); router.dismissAll(); router.replace('/'); };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.resultCard}>
                    <Ionicons name={impostersCaught ? "checkmark-circle" : "skull"} size={48} color={impostersCaught ? Colors.detective : Colors.suspect} />
                    <Text style={styles.resultTitle}>{impostersCaught ? 'CASE CLOSED!' : 'SUSPECT ESCAPED!'}</Text>
                    <Text style={styles.resultSub}>{impostersCaught ? 'The suspect was apprehended' : 'Deceived the investigators'}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>THE SUSPECT{suspects.length > 1 ? 'S' : ''}</Text>
                    {suspects.map((p) => (
                        <View key={p.id} style={styles.suspectRow}>
                            <Ionicons name="skull-outline" size={18} color={Colors.suspect} />
                            <Text style={styles.suspectName}>{p.name}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SECRET EVIDENCE</Text>
                    <View style={styles.wordBox}><Text style={styles.wordText}>{selectedWord?.word}</Text></View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ACCUSATIONS</Text>
                    {voteResults.map((r, i) => {
                        const p = players.find((x) => x.id === r.playerId);
                        return (
                            <View key={r.playerId} style={styles.voteRow}>
                                <Text style={styles.voteRank}>{i + 1}.</Text>
                                <Text style={[styles.voteName, p?.isImposter && { color: Colors.suspect }]}>{p?.name}</Text>
                                <Text style={styles.voteCount}>{r.votes} vote{r.votes !== 1 ? 's ' : ' '}</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.buttons}>
                    <Button
                        title="NEW CASE"
                        onPress={handleAgain}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="search" size={18} color={Colors.victorianBlack} />}
                    />
                    <Button
                        title="RETURN TO 221B"
                        onPress={handleHome}
                        variant="outline"
                        size="large"
                        icon={<Ionicons name="home-outline" size={16} color={Colors.candlelight} />}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 16, gap: 16 },

    resultCard: { alignItems: 'center', padding: 20, backgroundColor: Colors.grayDark, borderRadius: 14, gap: 6, borderWidth: 1.5, borderColor: Colors.candlelight },
    resultEmoji: { fontSize: 36, marginBottom: 4 },
    resultTitle: { fontSize: 20, fontWeight: '900', color: Colors.parchment, letterSpacing: 1.5 },
    resultSub: { fontSize: 12, color: Colors.candlelight, fontStyle: 'italic' },

    section: { gap: 8 },
    sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.candlelight, letterSpacing: 2 },

    suspectRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(160,32,32,0.15)', padding: 10, borderRadius: 10, borderWidth: 1.5, borderColor: Colors.suspect },
    suspectEmoji: { fontSize: 14 },
    suspectName: { fontSize: 14, fontWeight: '700', color: Colors.suspect, letterSpacing: 0.5 },

    wordBox: { backgroundColor: Colors.grayDark, padding: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, borderColor: Colors.candlelight },
    wordText: { fontSize: 18, fontWeight: '700', color: Colors.parchment, letterSpacing: 1 },

    voteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.grayMedium },
    voteRank: { width: 24, fontSize: 12, color: Colors.grayLight, fontWeight: '600' },
    voteName: { flex: 1, fontSize: 13, color: Colors.parchment },
    voteCount: { fontSize: 12, color: Colors.candlelight },

    buttons: { gap: 10, marginTop: 12 },
});
