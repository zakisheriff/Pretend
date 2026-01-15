import { GenericModal } from '@/components/common/GenericModal';
import { Button } from '@/components/game/Button';
import { ScoreBoard } from '@/components/game/ScoreBoard';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThreeActsResults() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const resetToHome = useGameStore((s) => s.resetToHome);
    const players = useGameStore((s) => s.players);

    const [showHomeConfirm, setShowHomeConfirm] = useState(false);

    const handlePlayAgain = () => {
        // Just navigate back to setup. The store state will be overwritten when new game starts.
        // Or we should manually reset phase?
        // `startThreeActsGame` will overwrite `gameData`.
        // We just need to ensure we don't carry over old state if specific components rely on it before start.
        // Setup screen manages its own local state mostly.
        router.replace('/three-acts/setup');
    };

    const handleGoHome = () => {
        resetToHome();
        router.replace('/');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <Text style={styles.title}>Final Results</Text>
            </View>

            <ScrollView
                style={styles.content}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            >
                <ScoreBoard players={players} />
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Play Again"
                    onPress={handlePlayAgain}
                    variant="primary"
                    size="large"
                    style={{ width: '100%', marginBottom: 12 }}
                    icon={<Ionicons name="refresh" size={20} color={Colors.victorianBlack} />}
                />
                <Button
                    title="Go Home"
                    onPress={() => setShowHomeConfirm(true)}
                    variant="outline"
                    size="large"
                    style={{ width: '100%', borderColor: Colors.candlelight }}
                    textStyle={{ color: Colors.candlelight }}
                    icon={<Ionicons name="home" size={20} color={Colors.candlelight} />}
                />
            </View>

            <GenericModal
                visible={showHomeConfirm}
                title="Return to Home?"
                message="Are you sure you want to leave? Current teams and scores will be reset."
                confirmLabel="Go Home"
                cancelLabel="Stay"
                onConfirm={handleGoHome}
                onCancel={() => setShowHomeConfirm(false)}
                isDestructive
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    header: { padding: 20, alignItems: 'center' },
    title: { fontSize: 32, color: Colors.candlelight, fontWeight: '900', letterSpacing: 2 },
    content: { flex: 1 },
    footer: { padding: 20, width: '100%' },
});
