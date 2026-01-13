import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VoteModeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleVerbal = () => {
        haptics.medium();
        router.push('/verbal-vote');
    };

    const handleDevice = () => {
        haptics.medium();
        router.push('/voting');
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.content}>
                <Ionicons name="help-circle-outline" size={60} color={Colors.candlelight} style={{ marginBottom: 20 }} />
                <Text style={styles.title}>How Will You Vote?</Text>
                <Text style={styles.subtitle}>Choose how to eliminate the suspect</Text>

                <View style={styles.buttonGroup}>
                    <View style={styles.optionContainer}>
                        <Button
                            title="Group Vote"
                            onPress={handleVerbal}
                            variant="primary"
                            size="large"
                            icon={<Ionicons name="people" size={20} color={Colors.victorianBlack} />}
                        />
                        <Text style={styles.desc}>Discuss openly and select one person to eliminate immediately.</Text>
                    </View>

                    <View style={styles.divider}>
                        <View style={styles.line} />
                        <Text style={styles.or}>or</Text>
                        <View style={styles.line} />
                    </View>

                    <View style={styles.optionContainer}>
                        <Button
                            title="Secret Ballot"
                            onPress={handleDevice}
                            variant="secondary"
                            size="large"
                            icon={<Ionicons name="phone-portrait" size={20} color={Colors.parchment} />}
                        />
                        <Text style={styles.desc}>Pass the device around. Each player casts a secret vote.</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack, paddingHorizontal: 20 },
    content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    title: { fontSize: 24, fontWeight: '800', color: Colors.parchment, letterSpacing: 2, marginBottom: 8, textAlign: 'center' },
    subtitle: { fontSize: 16, color: Colors.candlelight, marginBottom: 40, textAlign: 'center' },
    buttonGroup: { width: '100%', gap: 30 },
    optionContainer: { gap: 12 },
    desc: { color: Colors.candlelight, fontSize: 13, textAlign: 'center', paddingHorizontal: 20, lineHeight: 18 },
    divider: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    line: { flex: 1, height: 1, backgroundColor: Colors.grayMedium },
    or: { color: Colors.grayLight, fontSize: 12, fontWeight: '700' },
});
