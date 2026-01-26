import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnlineGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { players, myPlayerId, isHost } = useOnlineGameStore();
    const [revealed, setRevealed] = React.useState(false);

    const myPlayer = players.find(p => p.id === myPlayerId);

    if (!myPlayer) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={{ color: 'white' }}>Loading Player Data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#0A0A0A', '#000000']}
                style={styles.gradient}
            >
                <View style={[styles.content, { paddingTop: insets.top + 20, paddingBottom: insets.bottom }]}>

                    <Text style={styles.headerTitle}>Game In Progress</Text>

                    <View style={styles.cardContainer}>
                        {!revealed ? (
                            <TouchableOpacity
                                onPress={() => setRevealed(true)}
                                activeOpacity={0.8}
                                style={styles.cardInput}
                            >
                                <Animated.View entering={ZoomIn.duration(500)} style={styles.cardInner}>
                                    <Ionicons name="finger-print" size={64} color={Colors.parchment} />
                                    <Text style={styles.tapText}>TAP TO REVEAL ROLE</Text>
                                </Animated.View>
                            </TouchableOpacity>
                        ) : (
                            <Animated.View entering={FadeIn.duration(500)} style={styles.cardRevealed}>
                                <Text style={styles.roleLabel}>YOU ARE</Text>
                                <Text style={[
                                    styles.roleName,
                                    { color: myPlayer.isImposter ? '#FF4444' : Colors.candlelight }
                                ]}>
                                    {myPlayer.isImposter ? "THE IMPOSTER" : "CIVILIAN"}
                                </Text>

                                <View style={styles.divider} />

                                <Text style={styles.secretLabel}>SECRET WORD</Text>
                                <Text style={styles.secretWord}>{myPlayer.secretWord}</Text>

                                <View style={styles.hintContainer}>
                                    <Ionicons
                                        name={myPlayer.isImposter ? "eye-off-outline" : "search-outline"}
                                        size={24}
                                        color={Colors.grayLight}
                                    />
                                    <Text style={styles.instruction}>
                                        {myPlayer.isImposter
                                            ? "Try to blend in. Figure out the Civilian word."
                                            : "Find the Imposter who has a different word."}
                                    </Text>
                                </View>
                            </Animated.View>
                        )}
                    </View>

                    {isHost && (
                        <View style={styles.footer}>
                            <Button
                                title="Start Discussion (Soon)"
                                onPress={() => { }}
                                variant="outline"
                                disabled
                                style={{ opacity: 0.5 }}
                            />
                        </View>
                    )}
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradient: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },

    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.grayLight,
        marginBottom: 40,
        letterSpacing: 2,
    },

    cardContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        marginBottom: 80,
    },
    cardInput: {
        width: '100%',
        aspectRatio: 0.7,
        backgroundColor: '#1A1A1A',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.candlelight,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.candlelight,
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    cardInner: {
        alignItems: 'center',
        gap: 20,
    },
    tapText: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.parchment,
        letterSpacing: 2,
    },

    cardRevealed: {
        width: '100%',
        padding: 32,
        backgroundColor: '#111',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        alignItems: 'center',
        gap: 16,
    },
    roleLabel: {
        fontSize: 14,
        color: Colors.grayLight,
        letterSpacing: 2,
        fontWeight: '700',
    },
    roleName: {
        fontSize: 36,
        fontWeight: '900',
        letterSpacing: 1,
        textAlign: 'center',
        marginBottom: 10,
    },
    divider: {
        width: 40,
        height: 2,
        backgroundColor: Colors.grayMedium,
        marginVertical: 10,
    },
    secretLabel: {
        fontSize: 12,
        color: Colors.grayLight,
        letterSpacing: 2,
        fontWeight: '700',
    },
    secretWord: {
        fontSize: 42,
        color: Colors.parchment,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 20,
        letterSpacing: 2,
    },
    hintContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
    },
    instruction: {
        flex: 1,
        fontSize: 14,
        color: Colors.grayLight,
        lineHeight: 20,
    },
    footer: {
        width: '100%',
        position: 'absolute',
        bottom: 40,
    }
});
