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

    const handleNewGame = () => { resetToHome(); router.push('/add-players'); };
    const handleHowToPlay = () => { router.push('/how-to-play'); };

    return (
        <LinearGradient colors={[Colors.black, Colors.grayDark, Colors.black]} style={styles.gradient}>
            <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.content}>
                    <AnimatedLogo size={100} />
                    <View style={styles.titleBox}>
                        <Text style={styles.title}>IMPOSTER</Text>
                        <Text style={styles.subtitle}>THE GAME</Text>
                    </View>
                    <View style={styles.tagline}>
                        <Text style={styles.taglineText}>One phone. Many secrets.</Text>
                    </View>
                </View>

                <View style={styles.buttons}>
                    <Button title="NEW GAME" onPress={handleNewGame} variant="primary" size="large" hapticType="medium"
                        icon={<Ionicons name="play" size={18} color={Colors.black} />} />
                    <Button title="HOW TO PLAY" onPress={handleHowToPlay} variant="outline" size="medium"
                        icon={<Ionicons name="book-outline" size={16} color={Colors.white} />} />
                </View>

                <View style={styles.footer}>
                    <Ionicons name="cloud-offline-outline" size={12} color={Colors.grayMedium} />
                    <Text style={styles.footerText}>Offline Party Game</Text>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: { flex: 1, paddingHorizontal: 24 },
    content: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
    titleBox: { alignItems: 'center' },
    title: { fontSize: 36, fontWeight: '800', color: Colors.white, letterSpacing: 4 },
    subtitle: { fontSize: 16, fontWeight: '500', color: Colors.grayLight, letterSpacing: 2, marginTop: -4 },
    tagline: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.grayDark, borderRadius: 16, borderWidth: 1, borderColor: Colors.gray },
    taglineText: { fontSize: 12, color: Colors.grayLight, fontStyle: 'italic' },
    buttons: { gap: 12, marginBottom: 16 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
    footerText: { fontSize: 11, color: Colors.grayMedium },
});
