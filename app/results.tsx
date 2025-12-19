import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
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
    const imposters = players.filter((p) => p.isImposter);

    const scale = useSharedValue(0);
    useEffect(() => { scale.value = withDelay(200, withSpring(1, { damping: 10 })); haptics.success(); }, []);
    const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

    const handleAgain = () => { haptics.medium(); resetGame(); router.push('/add-players'); };
    const handleManagePlayers = () => { haptics.medium(); resetGame(); router.push('/add-players'); };
    const handleHome = () => { haptics.medium(); resetToHome(); router.dismissAll(); router.replace('/'); };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={[styles.resultCard, animStyle]}>
                    <Ionicons name={impostersCaught ? "trophy" : "skull"} size={48} color={impostersCaught ? Colors.success : Colors.imposter} />
                    <Text style={styles.resultTitle}>{impostersCaught ? 'CREWMATES WIN!' : 'IMPOSTER ESCAPED!'}</Text>
                    <Text style={styles.resultSub}>{impostersCaught ? 'The imposter was caught  ' : 'Fooled everyone  '}</Text>
                </Animated.View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>IMPOSTER{imposters.length > 1 ? 'S' : ''}</Text>
                    {imposters.map((p) => (
                        <View key={p.id} style={styles.imposterRow}>
                            <Ionicons name="skull" size={16} color={Colors.imposter} />
                            <Text style={styles.imposterName}>{p.name}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SECRET WORD</Text>
                    <View style={styles.wordBox}><Text style={styles.wordText}>{selectedWord?.word}</Text></View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>VOTES</Text>
                    {voteResults.map((r, i) => {
                        const p = players.find((x) => x.id === r.playerId);
                        return (
                            <View key={r.playerId} style={styles.voteRow}>
                                <Text style={styles.voteRank}>{i + 1}.</Text>
                                <Text style={[styles.voteName, p?.isImposter && { color: Colors.imposter }]}>{p?.name}</Text>
                                <Text style={styles.voteCount}>{r.votes}</Text>
                            </View>
                        );
                    })}
                </View>

                <View style={styles.buttons}>
                    <Button
                        title="PLAY AGAIN"
                        onPress={handleAgain}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="refresh" size={18} color={Colors.black} />}
                    />
                    <Button
                        title="HOME"
                        onPress={handleHome}
                        variant="outline"
                        size="medium"
                        icon={<Ionicons name="home-outline" size={16} color={Colors.white} />}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 },

    resultCard: { alignItems: 'center', padding: 24, backgroundColor: Colors.grayDark, borderRadius: 16, gap: 8, borderWidth: 1, borderColor: Colors.gray },
    resultTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
    resultSub: { fontSize: 13, color: Colors.grayLight, flexShrink: 0, paddingHorizontal: 4 },

    section: { gap: 8 },
    sectionTitle: { fontSize: 10, fontWeight: '700', color: Colors.grayMedium, letterSpacing: 2 },

    imposterRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,59,48,0.1)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.imposter },
    imposterName: { fontSize: 15, fontWeight: '700', color: Colors.imposter },

    wordBox: { backgroundColor: Colors.grayDark, padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: Colors.gray },
    wordText: { fontSize: 20, fontWeight: '700', color: Colors.white },

    voteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.gray },
    voteRank: { width: 24, fontSize: 12, color: Colors.grayMedium },
    voteName: { flex: 1, fontSize: 14, color: Colors.white },
    voteCount: { fontSize: 13, color: Colors.grayLight },

    buttons: { gap: 10, marginTop: 16 },
});
