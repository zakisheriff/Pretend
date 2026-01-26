import { GameAPI } from '@/api/game';
import { Button } from '@/components/game';
import { ChatModal } from '@/components/game/ChatModal';
import { DirectorSetup } from '@/components/game/DirectorSetup';
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
    const { players, myPlayerId, isHost, gameMode, gamePhase, roomCode } = useOnlineGameStore();
    const [revealed, setRevealed] = React.useState(false);
    const [chatVisible, setChatVisible] = React.useState(false);

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

                    <View style={styles.headerRow}>
                        <View style={{ width: 40 }} />
                        <Text style={styles.headerTitle}>Game In Progress</Text>
                        <TouchableOpacity onPress={() => setChatVisible(true)} style={styles.chatButton}>
                            <Ionicons name="chatbubbles-outline" size={24} color={Colors.parchment} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.cardContainer}>
                        {gamePhase === 'setup' ? (
                            myPlayer.role === 'director' ? (
                                <DirectorSetup onConfirm={async (json) => {
                                    if (roomCode) {
                                        await GameAPI.setDirectorMovie(roomCode, json);
                                    }
                                }} />
                            ) : (
                                <View style={{ alignItems: 'center', gap: 20, padding: 30 }}>
                                    <Animated.View style={{ opacity: 0.5 }}>
                                        <Ionicons name="videocam" size={80} color={Colors.grayMedium} />
                                    </Animated.View>
                                    <Text style={{
                                        color: Colors.parchment,
                                        textAlign: 'center',
                                        fontSize: 20,
                                        fontWeight: '700',
                                        letterSpacing: 1,
                                        lineHeight: 30
                                    }}>
                                        THE DIRECTOR IS CHOOSING A MOVIE...
                                    </Text>
                                    <Text style={{ color: Colors.grayLight, fontSize: 14 }}>
                                        Prepare to guess!
                                    </Text>
                                </View>
                            )
                        ) : !revealed && gamePhase !== 'discussion' ? (
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
                                {(() => {
                                    let roleTitle = "CIVILIAN";
                                    let roleColor = Colors.candlelight;
                                    let secretDisplay = myPlayer.secretWord;
                                    let secretLabelText = "SECRET WORD";
                                    let hintText = "Find the Imposter who has a different word.";
                                    let iconName = "search-outline";

                                    if (gameMode === 'time-bomb') {
                                        roleTitle = "SURVIVOR";
                                        roleColor = Colors.parchment;
                                        secretLabelText = "TOPIC & LETTER";
                                        iconName = "timer-outline";

                                        try {
                                            const data = JSON.parse(myPlayer.secretWord || '{}');
                                            secretDisplay = `${data.category}\nLetter: ${data.letter}`;
                                        } catch (e) {
                                            secretDisplay = myPlayer.secretWord;
                                        }
                                        hintText = "Say a word in this category starting with the letter to pass the bomb!";

                                    } else if (gameMode === 'directors-cut') {
                                        if (myPlayer.role === 'director') {
                                            roleTitle = "THE DIRECTOR";
                                            roleColor = Colors.parchment;
                                            hintText = "Act out this movie silently! No talking!";
                                            iconName = "videocam-outline";

                                            try {
                                                const data = JSON.parse(myPlayer.secretWord || '{}');
                                                secretDisplay = data.title;
                                                secretLabelText = `${data.genre?.toUpperCase()} • ${data.year}`;
                                            } catch (e) {
                                                secretDisplay = myPlayer.secretWord;
                                            }
                                        } else {
                                            roleTitle = "AUDIENCE";
                                            secretDisplay = "???";
                                            secretLabelText = "GUESS THE MOVIE";
                                            hintText = "Watch the Director and guess the movie!";
                                            iconName = "eye-outline";
                                        }

                                    } else if (gameMode === 'wavelength') {
                                        if (myPlayer.role === 'psychic') {
                                            roleTitle = "PSYCHIC";
                                            hintText = "Give a clue that fits the target on the spectrum.";
                                        } else {
                                            roleTitle = "GUESSER";
                                            secretDisplay = "WAITING...";
                                            hintText = "Discuss and guess where the target is.";
                                        }

                                    } else {
                                        // Default: Imposter / Undercover
                                        if (myPlayer.isImposter) {
                                            roleTitle = "THE IMPOSTER";
                                            roleColor = '#FF4444';
                                            hintText = "Try to blend in. Figure out the Civilian word.";
                                            iconName = "eye-off-outline";
                                        }
                                    }

                                    return (
                                        <>
                                            <Text style={styles.roleLabel}>YOU ARE</Text>
                                            <Text style={[styles.roleName, { color: roleColor }]}>
                                                {roleTitle}
                                            </Text>

                                            <View style={styles.divider} />

                                            <Text style={styles.secretLabel}>{secretLabelText}</Text>
                                            <Text style={styles.secretWord}>{secretDisplay}</Text>

                                            <View style={styles.hintContainer}>
                                                <Ionicons name={iconName as any} size={24} color={Colors.grayLight} />
                                                <Text style={styles.instruction}>{hintText}</Text>
                                            </View>
                                        </>
                                    );
                                })()}
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
            <ChatModal visible={chatVisible} onClose={() => setChatVisible(false)} />
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

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 40,
    },
    chatButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.grayLight,
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
