import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEPS = [
    { icon: 'people-outline', title: 'Gather Investigators', desc: '3-10 players on one phone' },
    { icon: 'albums-outline', title: 'Choose Your Case', desc: 'Pick an evidence category' },
    { icon: 'document-text-outline', title: 'Unseal Identities', desc: 'Each player drags up to see their role' },
    { icon: 'search-outline', title: 'Detectives', desc: 'See the SECRET EVIDENCE. Describe without saying it' },
    { icon: 'skull-outline', title: 'Suspects', desc: 'Only get a CLUE. Fake it and blend in' },
    { icon: 'chatbubbles-outline', title: 'Investigate', desc: 'Discuss the evidence. Find the imposter' },
    { icon: 'hand-left-outline', title: 'Accuse', desc: 'Vote who you think is the suspect' },
    { icon: 'trophy-outline', title: 'Case Closed', desc: 'Detectives win if they apprehend the suspect' },
] as const;

export default function HowToPlayScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Ionicons name="search" size={20} color={Colors.parchment} />
                    <Text style={styles.title}>THE ART OF DEDUCTION</Text>
                </View>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={Colors.parchment} />
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.steps}>
                    {STEPS.map((s, i) => (
                        <View key={i} style={styles.step}>
                            <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                            <View style={styles.stepBody}>
                                <View style={styles.stepHeader}>
                                    <Ionicons name={s.icon as any} size={16} color={Colors.candlelight} />
                                    <Text style={styles.stepTitle}>{s.title}</Text>
                                </View>
                                <Text style={styles.stepDesc}>{s.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.tipBox}>
                    <View style={styles.tipTitleRow}>
                        <Ionicons name="bulb" size={16} color={Colors.candlelight} />
                        <Text style={styles.tipTitle}>SHERLOCK'S TIPS</Text>
                    </View>
                    <Text style={styles.tip}>• Observe carefully, deduce wisely</Text>
                    <Text style={styles.tip}>• Watch for hesitation and confusion</Text>
                    <Text style={styles.tip}>• Suspects: match the group's energy</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 16, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.grayDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.grayMedium },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 20, gap: 18 },

    steps: { gap: 12 },
    step: { flexDirection: 'row', backgroundColor: Colors.grayDark, borderRadius: 14, padding: 14, gap: 14, borderWidth: 1.5, borderColor: Colors.grayMedium },
    stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.candlelight, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { fontSize: 12, fontWeight: '800', color: Colors.victorianBlack },
    stepBody: { flex: 1, gap: 4 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepTitle: { fontSize: 14, fontWeight: '700', color: Colors.parchment, letterSpacing: 0.5 },
    stepDesc: { fontSize: 12, color: Colors.grayLight, lineHeight: 18 },

    tipBox: { backgroundColor: 'rgba(196,167,108,0.12)', borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor: Colors.candlelight },
    tipTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    tipTitle: { fontSize: 12, fontWeight: '800', color: Colors.candlelight, letterSpacing: 1 },
    tip: { fontSize: 12, color: Colors.grayLight, marginBottom: 5 },
});
