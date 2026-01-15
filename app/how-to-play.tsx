import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const GAME_MODES_INFO = [
    {
        id: 'classic',
        name: 'Classic Imposter',
        icon: 'people-outline',
        color: Colors.detective,
        steps: [
            { icon: 'eye-outline', role: 'Crewmates', desc: 'See the SECRET WORD and describe it' },
            { icon: 'skull-outline', role: 'Imposter', desc: 'Only gets a CLUE - fake it and blend in!' },
        ],
        tip: 'Watch for vague descriptions and hesitation',
    },
    {
        id: 'directors',
        name: "Director's Cut",
        icon: 'videocam-outline',
        color: Colors.gaslightAmber,
        steps: [
            { icon: 'film-outline', role: 'Director', desc: 'Knows the MOVIE - answer yes/no questions' },
            { icon: 'eye-outline', role: 'Viewers', desc: 'Get hints and ask questions to guess the movie' },
        ],
        tip: 'Ask clever yes/no questions to narrow it down',
    },
    {
        id: 'mindsync',
        name: 'Mind Sync',
        icon: 'git-compare-outline',
        color: Colors.candlelight,
        steps: [
            { icon: 'sync-outline', role: 'In Sync', desc: 'Answer the question - find who has a different one' },
            { icon: 'flash-outline', role: 'Outlier', desc: 'Has a different question - give a believable answer!' },
        ],
        tip: 'Compare answers carefully - spot inconsistencies',
    },
    {
        id: 'undercover',
        name: 'Undercover',
        icon: 'search-outline',
        color: Colors.suspect,
        steps: [
            { icon: 'person-outline', role: 'Players', desc: 'Everyone gets a word - describe without revealing' },
            { icon: 'help-outline', role: 'Undercover', desc: 'Has a DIFFERENT word from the same theme!' },
        ],
        tip: 'Your word might be similar but not the same - be careful!',
    },
    {
        id: 'thief-police',
        name: 'Thief & Police',
        icon: 'shield-checkmark-outline',
        color: Colors.detective,
        steps: [
            { icon: 'shield-outline', role: 'Police', desc: 'Knows the word. Must find the Thief!' },
            { icon: 'finger-print-outline', role: 'Thief', desc: 'Has a DIFFERENT word. Must blend in!' },
            { icon: 'person-outline', role: 'Civilians', desc: 'Know the word. Help the Police!' },
        ],
        tip: 'Police decides when to arrest. Civilians help verify.',
    },
    {
        id: 'time-bomb',
        name: 'Time Bomb',
        icon: 'timer-outline',
        color: Colors.suspect,
        steps: [
            { icon: 'mic-outline', role: 'Answer', desc: 'Name a word that matches the prompt' },
            { icon: 'play-forward-outline', role: 'Pass', desc: 'Hand the phone to the next player quickly!' },
        ],
        tip: "Don't be the one holding the phone when it explodes!",
    },
    {
        id: 'charades',
        name: 'Charades',
        icon: 'happy-outline',
        color: Colors.gaslightAmber,
        steps: [
            { icon: 'body-outline', role: 'Act', desc: 'Act out or describe the word on screen' },
            { icon: 'resize-outline', role: 'Tilt', desc: 'Tilt DOWN for Correct, UP to Pass' },
        ],
        tip: 'Use device motion! No touching required.',
    },
    {
        id: 'wavelength',
        name: 'Wavelength',
        icon: 'pulse-outline',
        color: Colors.detective,
        steps: [
            { icon: 'eye-outline', role: 'Psychic', desc: 'Gives a clue for the target range' },
            { icon: 'people-outline', role: 'Group', desc: 'Discuss and align the dial!' },
            { icon: 'trophy-outline', role: 'Scoring', desc: 'Bullseye (5%) = 2pts, Close (15%) = 1pt' },
        ],
        tip: 'Think about how the group perceives the scale!',
    },
    {
        id: 'three-acts',
        name: 'Three Acts',
        icon: 'film-outline',
        color: Colors.gaslightAmber,
        steps: [
            { icon: 'time-outline', role: 'Rules', desc: 'Guess 3 movies within 60 seconds' },
            { icon: 'people-outline', role: 'Pairs', desc: 'One describes, one guesses' },
            { icon: 'trophy-outline', role: 'Scoring', desc: '3 Right = 2pts each. 1-2 Right = 1pt each' },
        ],
        tip: 'Skip quickly if stuck - maximize your time!',
    },
];

const COMMON_STEPS = [
    { icon: 'people-outline', title: 'Gather Players', desc: '3-10 players on one phone' },
    { icon: 'game-controller-outline', title: 'Choose Mode', desc: 'Pick your game style' },
    { icon: 'finger-print-outline', title: 'Reveal Roles', desc: 'Drag up to see your secret role' },
    { icon: 'chatbubbles-outline', title: 'Discuss', desc: 'Talk, question, and deduce' },
    { icon: 'hand-left-outline', title: 'Vote', desc: 'Eliminate who you suspect' },
    { icon: 'trophy-outline', title: 'Win', desc: 'Find the odd one out to win!' },
];

function CloseButton({ onPress }: { onPress: () => void }) {
    const scale = useSharedValue(1);
    const rotation = useSharedValue(0);

    const handlePress = () => {
        haptics.light();
        scale.value = withSequence(
            withSpring(0.85, { damping: 10, stiffness: 400 }),
            withSpring(1.05, { damping: 8, stiffness: 300 }),
            withSpring(1, { damping: 10, stiffness: 400 })
        );
        rotation.value = withSequence(
            withSpring(90, { damping: 10, stiffness: 400 }),
            withSpring(0, { damping: 10, stiffness: 400 })
        );
        setTimeout(onPress, 100);
    };

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    }));

    return (
        <AnimatedPressable onPress={handlePress} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={Colors.parchment} />
        </AnimatedPressable>
    );
}

export default function HowToPlayScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [selectedMode, setSelectedMode] = useState<string | null>(null);

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.header, { paddingTop: insets.top + 10 }]}
            >
                <View style={styles.titleRow}>
                    <Ionicons name="book-outline" size={20} color={Colors.parchment} />
                    <Text style={styles.title}>How to Play</Text>
                </View>
                <CloseButton onPress={() => router.back()} />
            </LinearGradient>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Common Steps */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>The Basics</Text>
                    <View style={styles.steps}>
                        {COMMON_STEPS.map((s, i) => (
                            <View key={i} style={styles.step}>
                                <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                                <View style={styles.stepBody}>
                                    <View style={styles.stepHeader}>
                                        <Ionicons name={s.icon as any} size={14} color={Colors.candlelight} />
                                        <Text style={styles.stepTitle}>{s.title}</Text>
                                    </View>
                                    <Text style={styles.stepDesc}>{s.desc}</Text>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Game Modes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Game Modes</Text>
                    <Text style={styles.sectionSubtitle}>Tap a mode to learn more</Text>
                    <View style={styles.modesGrid}>
                        {GAME_MODES_INFO.map((mode) => (
                            <Pressable
                                key={mode.id}
                                style={[
                                    styles.modeCard,
                                    selectedMode === mode.id && { borderColor: mode.color, backgroundColor: 'rgba(196,167,108,0.1)' }
                                ]}
                                onPress={() => {
                                    haptics.light();
                                    setSelectedMode(selectedMode === mode.id ? null : mode.id);
                                }}
                            >
                                <Ionicons name={mode.icon as any} size={24} color={mode.color} />
                                <Text style={[styles.modeName, selectedMode === mode.id && { color: mode.color }]}>
                                    {mode.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Selected Mode Details */}
                    {selectedMode && (
                        <View style={styles.modeDetails}>
                            {GAME_MODES_INFO.filter(m => m.id === selectedMode).map(mode => (
                                <View key={mode.id}>
                                    <View style={styles.rolesList}>
                                        {mode.steps.map((step, i) => (
                                            <View key={i} style={styles.roleItem}>
                                                <View style={[styles.roleIcon, { backgroundColor: mode.color }]}>
                                                    <Ionicons name={step.icon as any} size={16} color={Colors.victorianBlack} />
                                                </View>
                                                <View style={styles.roleBody}>
                                                    <Text style={[styles.roleName, { color: mode.color }]}>{step.role}</Text>
                                                    <Text style={styles.roleDesc}>{step.desc}</Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                    <View style={styles.modeTip}>
                                        <Ionicons name="bulb" size={14} color={Colors.candlelight} />
                                        <Text style={styles.modeTipText}>{mode.tip}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* Pro Tips */}
                <View style={styles.tipBox}>
                    <View style={styles.tipTitleRow}>
                        <Ionicons name="sparkles" size={16} color={Colors.candlelight} />
                        <Text style={styles.tipTitle}>Pro Tips</Text>
                    </View>
                    <Text style={styles.tip}>• Watch for hesitation and vague answers</Text>
                    <Text style={styles.tip}>• Ask follow-up questions to catch liars</Text>
                    <Text style={styles.tip}>• Imposters: match the group's energy!</Text>
                    <Text style={styles.tip}>• Don't be too specific or too vague</Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { fontSize: 16, fontWeight: '800', color: Colors.parchment, letterSpacing: 2 },
    closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.grayDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.grayMedium },

    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingTop: 80, paddingBottom: 30, gap: 24 },

    section: { gap: 12 },
    sectionTitle: { fontSize: 12, fontWeight: '800', color: Colors.candlelight, letterSpacing: 2 },
    sectionSubtitle: { fontSize: 11, color: Colors.candlelight, marginTop: -8 },

    steps: { gap: 8 },
    step: { flexDirection: 'row', backgroundColor: Colors.grayDark, borderRadius: 25, padding: 12, gap: 12, borderWidth: 1, borderColor: Colors.grayMedium },
    stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.candlelight, alignItems: 'center', justifyContent: 'center' },
    stepNumText: { fontSize: 11, fontWeight: '800', color: Colors.victorianBlack },
    stepBody: { flex: 1, gap: 2 },
    stepHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepTitle: { fontSize: 13, fontWeight: '700', color: Colors.parchment },
    stepDesc: { fontSize: 11, color: Colors.parchment, opacity: 0.85 },

    modesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    modeCard: { width: '48%', backgroundColor: Colors.grayDark, borderRadius: 25, padding: 14, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: Colors.grayMedium },
    modeName: { fontSize: 11, fontWeight: '700', color: Colors.parchment, textAlign: 'center' },

    modeDetails: { backgroundColor: Colors.grayDark, borderRadius: 25, padding: 14, borderWidth: 1, borderColor: Colors.grayMedium },
    rolesList: { gap: 10 },
    roleItem: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
    roleIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    roleBody: { flex: 1 },
    roleName: { fontSize: 12, fontWeight: '700' },
    roleDesc: { fontSize: 11, color: Colors.parchment, opacity: 0.85, marginTop: 2 },
    modeTip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.grayMedium },
    modeTipText: { fontSize: 11, color: Colors.candlelight, fontStyle: 'italic', flex: 1 },

    tipBox: { backgroundColor: 'rgba(196,167,108,0.12)', borderRadius: 25, padding: 16, borderWidth: 1.5, borderColor: Colors.candlelight },
    tipTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    tipTitle: { fontSize: 12, fontWeight: '800', color: Colors.candlelight, letterSpacing: 1 },
    tip: { fontSize: 11, color: Colors.parchment, marginBottom: 4 },
});
