import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const STEPS = [
    { icon: 'people-outline', title: 'Add Players', desc: '3-10 players on one phone' },
    { icon: 'albums-outline', title: 'Choose Theme', desc: 'Pick a word category' },
    { icon: 'eye-outline', title: 'Reveal Roles', desc: 'Each player drags up to see their role' },
    { icon: 'checkmark-circle-outline', title: 'Crewmates', desc: 'See the SECRET WORD. Describe without saying it' },
    { icon: 'skull-outline', title: 'Imposter', desc: 'Only get a HINT. Fake it and blend in' },
    { icon: 'chatbubbles-outline', title: 'Discuss', desc: 'Talk about the word. Find the faker' },
    { icon: 'checkbox-outline', title: 'Vote', desc: 'Vote who you think is the imposter' },
    { icon: 'trophy-outline', title: 'Win', desc: 'Crewmates win if they catch the imposter' },
] as const;

export default function HowToPlayScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <Text style={styles.title}>HOW TO PLAY</Text>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
                    <Ionicons name="close" size={20} color={Colors.white} />
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
                                    <Ionicons name={s.icon as any} size={16} color={Colors.white} />
                                    <Text style={styles.stepTitle}>{s.title}</Text>
                                </View>
                                <Text style={styles.stepDesc}>{s.desc}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.tipBox}>
                    <Text style={styles.tipTitle}>PRO TIPS</Text>
                    <Text style={styles.tip}>• Don't be too obvious when describing</Text>
                    <Text style={styles.tip}>• Watch for confused players</Text>
                    <Text style={styles.tip}>• Imposters: match the group's energy</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.black },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    title: { fontSize: 18, fontWeight: '700', color: Colors.white, letterSpacing: 1 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.grayDark, alignItems: 'center', justifyContent: 'center' },

    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 20, gap: 16 },

    steps: { gap: 10 },
    step: { flexDirection: 'row', backgroundColor: Colors.grayDark, borderRadius: 12, padding: 12, gap: 12, borderWidth: 1, borderColor: Colors.gray },
    stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { fontSize: 12, fontWeight: '700', color: Colors.black },
    stepBody: { flex: 1, gap: 4 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepTitle: { fontSize: 14, fontWeight: '600', color: Colors.white },
    stepDesc: { fontSize: 12, color: Colors.grayLight, lineHeight: 18 },

    tipBox: { backgroundColor: 'rgba(52,199,89,0.1)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.success },
    tipTitle: { fontSize: 12, fontWeight: '700', color: Colors.success, marginBottom: 8 },
    tip: { fontSize: 12, color: Colors.grayLight, marginBottom: 4 },
});
