import { Button, NeumorphicCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MindSyncRevealScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const gameData = useGameStore((s) => s.gameData);
    const startDiscussion = useGameStore((s) => s.startDiscussion);

    const [isRevealed, setIsRevealed] = React.useState(false);

    // Block back navigation
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

    if (!gameData || gameData.type !== 'mind-sync') {
        return null;
    }

    const { mainQuestion, category } = gameData.data;

    const handleReveal = () => {
        haptics.medium();
        setIsRevealed(true);
    };

    const handleStartDiscussion = () => {
        haptics.heavy();
        startDiscussion();
        router.push('/discussion');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.header}>
                <View style={styles.iconCircle}>
                    <Ionicons name={isRevealed ? "git-compare" : "chatbubbles-outline"} size={32} color={Colors.candlelight} />
                </View>
                <Text style={styles.title}>{isRevealed ? "The Reveal" : "The Argument"}</Text>
                <Text style={styles.subtitle}>Category: {category}</Text>
            </Animated.View>

            <View style={styles.cardsArea}>
                {!isRevealed ? (
                    <Animated.View entering={FadeInUp.duration(600)} style={styles.argumentPhase}>
                        <View style={styles.instructionCard}>
                            <Ionicons name="megaphone-outline" size={40} color={Colors.candlelight} style={{ marginBottom: 15 }} />
                            <Text style={styles.argumentTitle}>Time to Argue!</Text>
                            <Text style={styles.argumentText}>
                                Discuss your answers based on your secret questions.
                                Can you spot the Outlier based on their answer alone?
                            </Text>
                        </View>
                    </Animated.View>
                ) : (
                    <Animated.View entering={FadeInUp.delay(200).duration(800)} style={styles.cardWrapper}>
                        <Text style={styles.cardLabel}>The Question was:</Text>
                        <NeumorphicCard style={styles.mainCard}>
                            <Text style={styles.questionText}>{mainQuestion}</Text>
                        </NeumorphicCard>
                        <Text style={styles.outlierHint}>
                            If your question was different, you are the OUTLIER.
                        </Text>
                    </Animated.View>
                )}
            </View>

            <Animated.View entering={FadeInDown.delay(isRevealed ? 400 : 800).duration(600)} style={styles.footer}>
                {!isRevealed ? (
                    <Button
                        title="Reveal Question"
                        onPress={handleReveal}
                        variant="primary"
                        size="large"
                        icon={<Ionicons name="eye-outline" size={18} color={Colors.victorianBlack} />}
                    />
                ) : (
                    <>
                        <View style={styles.alertBox}>
                            <Ionicons name="alert-circle-outline" size={20} color={Colors.candlelight} />
                            <Text style={styles.alertText}>
                                Now you know the question. Who was out of sync?
                            </Text>
                        </View>

                        <Button
                            title="Start Timer"
                            onPress={handleStartDiscussion}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="timer-outline" size={18} color={Colors.victorianBlack} />}
                        />
                    </>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
        paddingHorizontal: 20,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginTop: 10,
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(196,167,108,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(196,167,108,0.3)',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: Colors.parchment,
        letterSpacing: 3,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 12,
        color: Colors.candlelight,
        marginTop: 6,
        letterSpacing: 2,
        textTransform: 'uppercase',
        opacity: 0.8,
    },
    cardsArea: {
        flex: 1,
        justifyContent: 'center',
        gap: 25,
        marginVertical: 20,
    },
    argumentPhase: {
        alignItems: 'center',
        gap: 30,
    },
    instructionCard: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    argumentTitle: {
        color: Colors.parchment,
        fontSize: 24,
        fontWeight: '800',
        marginBottom: 15,
    },
    argumentText: {
        color: Colors.grayLight,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
    cardWrapper: {
        gap: 12,
    },
    cardLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.grayLight,
        letterSpacing: 1,
        textTransform: 'uppercase',
        paddingLeft: 10,
    },
    mainCard: {
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(196,167,108,0.2)',
    },
    outlierHint: {
        fontSize: 14,
        color: Colors.grayLight,
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    questionText: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.parchment,
        textAlign: 'center',
        lineHeight: 30,
        fontStyle: 'italic',
    },
    footer: {
        gap: 15,
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(196,167,108,0.1)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(196,167,108,0.2)',
    },
    alertText: {
        flex: 1,
        fontSize: 13,
        color: Colors.parchment,
        lineHeight: 18,
    },
});
