import { AnimatedLogo, Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const resetToHome = useGameStore((state) => state.resetToHome);

    const handleNewGame = () => { resetToHome(); router.push('/select-mode'); };
    const handleHowToPlay = () => { router.push('/how-to-play'); };

    return (
        <LinearGradient
            colors={[Colors.victorianBlack, Colors.grayDark, Colors.victorianBlack]}
            style={styles.gradient}
        >
            <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.content}>
                    <AnimatedLogo size={110} />
                    <View style={styles.titleBox}>
                        <Text style={styles.title}>Pretend</Text>
                        <Text style={styles.subtitle}>A Detective Mystery</Text>
                    </View>
                    <View style={styles.tagline}>
                        <Text style={styles.taglineText}>One phone. One mystery.</Text>
                    </View>
                </View>

                <View style={styles.buttons}>
                    <Button
                        title="New Case"
                        onPress={handleNewGame}
                        variant="primary"
                        size="large"
                        hapticType="medium"
                        icon={<Ionicons name="search" size={24} color={Colors.victorianBlack} />}
                    />

                    <Button
                        title="How to Play"
                        onPress={handleHowToPlay}
                        variant="outline"
                        size="large"
                        icon={<Ionicons name="book-outline" size={24} color={Colors.parchment} />}
                    />
                </View>

                <View style={styles.footer}>
                    <Ionicons name="home" size={14} color={Colors.grayMedium} />
                    <Text style={styles.footerText}>221B Baker Street Experience </Text>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1, paddingHorizontal: 24 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 24 },
    titleBox: { alignItems: 'center' },
    title: {
        fontSize: 40,
        fontWeight: '900',
        color: Colors.parchment,
        letterSpacing: 8,
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '500',
        color: Colors.candlelight,
        letterSpacing: 4,
        marginTop: 4,
    },
    tagline: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: Colors.grayDark,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.grayMedium,
    },
    taglineText: {
        fontSize: 13,
        color: Colors.grayLight,
        fontStyle: 'italic',
        paddingHorizontal: 4,
        letterSpacing: 1,
    },
    buttons: { gap: 14, marginBottom: 20 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },

    footerText: { fontSize: 12, color: Colors.grayMedium, letterSpacing: 1 },
});
