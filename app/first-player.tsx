import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function FirstPlayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const [firstPlayer, setFirstPlayer] = useState<{ id: string; name: string } | null>(null);

    // Block back navigation
    useEffect(() => {
        const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);
        return () => backHandler.remove();
    }, []);

    useEffect(() => {
        // Randomly select a player on mount
        if (players.length > 0) {
            const randomIndex = Math.floor(Math.random() * players.length);
            setFirstPlayer(players[randomIndex]);
        }
    }, [players]);

    const handleStart = () => {
        haptics.gameStart();
        router.push('/start-game');
    };

    if (!firstPlayer) return null;

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.content}>
                <Animated.View entering={FadeInUp.delay(300).springify()}>
                    <Text style={styles.title}>WHO STARTS?</Text>
                    <Text style={styles.subtitle}>The investigation begins with...</Text>
                </Animated.View>

                <Animated.View entering={ZoomIn.delay(600).springify()} style={styles.playerContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="person" size={50} color={Colors.victorianBlack} />
                    </View>
                    <Text style={styles.playerName}>{firstPlayer.name}</Text>
                </Animated.View>

                <Animated.View entering={FadeInUp.delay(1000).springify()} style={styles.instructionBox}>
                    <Ionicons name="information-circle-outline" size={24} color={Colors.candlelight} />
                    <Text style={styles.instruction}>
                        {firstPlayer.name} should start by asking the first question or sharing a clue related to the word.
                    </Text>
                </Animated.View>
            </View>

            <View style={styles.footer}>
                <Button
                    title="START TIMER"
                    onPress={handleStart}
                    variant="primary"
                    size="large"
                    icon={<Ionicons name="timer-outline" size={20} color={Colors.victorianBlack} />}
                />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
        paddingHorizontal: 20,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 16,
        color: Colors.candlelight,
        fontFamily: 'SpecialElite_400Regular', // Assuming font is available globally or falls back
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 28,
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 40,
    },
    playerContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.candlelight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: Colors.candlelight,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    playerName: {
        fontSize: 36,
        color: Colors.candlelight,
        fontWeight: 'bold',
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    instructionBox: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    instruction: {
        flex: 1,
        color: Colors.grayLight,
        fontSize: 14,
        marginLeft: 10,
        lineHeight: 20,
    },
    footer: {
        width: '100%',
    },
});
