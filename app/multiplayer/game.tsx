import { GameAPI } from '@/api/game';
import { Button } from '@/components/game';
import { DirectorSetup } from '@/components/game/DirectorSetup';
import { OnlineDirectorVerdictView } from '@/components/game/OnlineDirectorVerdictView';
import { OnlineResultsView } from '@/components/game/OnlineResultsView';
import { WavelengthView } from '@/components/game/WavelengthView';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function DirectorVerdictModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <View style={{ alignItems: 'flex-end', padding: 10 }}>
                    <TouchableOpacity onPress={onClose} style={{ padding: 10 }}>
                        <Ionicons name="close" size={30} color="white" />
                    </TouchableOpacity>
                </View>
                <OnlineDirectorVerdictView />
            </View>
        </Modal>
    );
}

export default function OnlineGameScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const {
        players, myPlayerId, isHost, gameMode, gamePhase, roomCode, gameStatus, kicked, leaveGame
    } = useOnlineGameStore();
    const [revealed, setRevealed] = React.useState(false);
    const [selectedDirectorId, setSelectedDirectorId] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [showPlayerSelect, setShowPlayerSelect] = React.useState(false);
    const [guessVisible, setGuessVisible] = React.useState(false);
    const [guess, setGuess] = React.useState('');
    const [timeLeft, setTimeLeft] = React.useState(120);

    React.useEffect(() => {
        if (gameStatus === 'LOBBY') {
            router.replace('/multiplayer/lobby' as any);
        } else if (kicked) {
            leaveGame();
            router.replace('/');
        }
    }, [gameStatus, kicked]);

    React.useEffect(() => {
        if (gamePhase === 'discussion') {
            const interval = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
            return () => clearInterval(interval);
        }
    }, [gamePhase]);

    // Sync revealed state if phase moves past setup
    React.useEffect(() => {
        if (gamePhase === 'discussion' || gamePhase === 'voting' || gamePhase === 'results') {
            setRevealed(true);
        }
    }, [gamePhase]);

    const handleGuess = async () => {
        if (!guess.trim() || !roomCode) return;
        const { correct, title } = await GameAPI.verifyGuess(roomCode, guess);
        if (correct) {
            alert(`CORRECT! The movie was ${title}`);
            setGuessVisible(false);
        } else {
            alert("Incorrect! Keep discussing.");
            setGuessVisible(false);
        }
    };

    const { showAlert, AlertComponent } = useCustomAlert();

    const handleLeave = () => {
        showAlert(
            "Leave Game?",
            "Are you sure you want to leave the game? You won't be able to rejoin if the game is in progress.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Leave",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        await leaveGame();
                        router.replace('/');
                    }
                }
            ]
        );
    };

    const myPlayer = players.find(p => p.id === myPlayerId);

    if (!myPlayer) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={{ color: 'white' }}>Loading Player Data...</Text>
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <View style={styles.container}>
                <LinearGradient
                    colors={['#000000', '#0A0A0A', '#000000']}
                    style={styles.gradient}
                >
                    <ScrollView
                        style={{ flex: 1 }}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={[styles.content, { paddingTop: insets.top + 20 }]}>

                            <View style={styles.headerRow}>
                                <TouchableOpacity
                                    onPress={handleLeave}
                                    style={styles.backButton}
                                >
                                    <Ionicons name="close" size={24} color={Colors.parchment} />
                                </TouchableOpacity>
                                <Text style={styles.headerTitle}>Game In Progress</Text>
                                <View style={{ width: 44 }} />
                            </View>

                            <View style={styles.cardContainer}>
                                {gamePhase === 'results' || (gameStatus as any) === 'FINISHED' ? (
                                    <OnlineResultsView />
                                ) : gameMode === 'wavelength' ? (
                                    <WavelengthView
                                        players={players}
                                        myPlayerId={myPlayerId!}
                                        roomCode={roomCode!}
                                        gamePhase={gamePhase || 'discussion'}
                                        isHost={isHost}
                                    />
                                ) : (gamePhase === 'setup' || gamePhase === 'SETUP_DIRECTOR:PLAYER' || gamePhase === 'SELECT_DIRECTOR' || gamePhase === 'SETUP_DIRECTOR:MOVIE' || gamePhase === 'SETUP_DIRECTOR:TIMER') ? (
                                    <DirectorSetup
                                        isReadOnly={myPlayer.role !== 'director'}
                                        onConfirm={async (json) => {
                                            if (roomCode) {
                                                await GameAPI.setDirectorMovie(roomCode, json);
                                                try {
                                                    const data = JSON.parse(json);
                                                    if (data.timer) setTimeLeft(data.timer);
                                                } catch (e) { }
                                            }
                                        }}
                                    />
                                ) : (!revealed && gameMode !== 'directors-cut' && !['discussion', 'voting', 'results', 'setup'].includes(gamePhase || '')) ? (
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
                                ) : (revealed || ['discussion', 'voting', 'results'].includes(gamePhase || '')) ? (
                                    <Animated.View entering={FadeIn.duration(500)} style={styles.cardRevealed}>
                                        {(() => {
                                            let roleTitle = "CIVILIAN";
                                            let roleColor = Colors.candlelight;
                                            let secretDisplay = myPlayer.secretWord || '...';
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
                                                    secretDisplay = data.category ? `${data.category}\nLetter: ${data.letter}` : 'Loading...';
                                                } catch (e) {
                                                    secretDisplay = myPlayer.secretWord || '...';
                                                }
                                                hintText = "Say a word in this category starting with the letter to pass the bomb!";
                                            } else if (gameMode === 'directors-cut') {
                                                if (myPlayer.role === 'director') {
                                                    roleTitle = "THE DIRECTOR";
                                                    roleColor = Colors.parchment;
                                                    hintText = "Only Yes or No for The Questions.";
                                                    iconName = "videocam-outline";
                                                    try {
                                                        const secretStr = myPlayer.secretWord;
                                                        if (secretStr && secretStr !== 'WAITING' && secretStr !== '???') {
                                                            const data = JSON.parse(secretStr);
                                                            secretDisplay = data.title || 'Choosing...';
                                                            secretLabelText = data.genre ? `${data.genre?.toUpperCase()} • ${data.year}` : 'PREPARING MOVIE...';
                                                        } else {
                                                            secretDisplay = secretStr === 'WAITING' ? 'Choosing...' : (secretStr || '...');
                                                        }
                                                    } catch (e) {
                                                        secretDisplay = myPlayer.secretWord || '...';
                                                    }
                                                } else {
                                                    roleTitle = "AUDIENCE";
                                                    secretDisplay = "???";
                                                    secretLabelText = "GUESS THE MOVIE";
                                                    hintText = "Ask Questions from the Director and Get Yes or No Answers.";
                                                    iconName = "eye-outline";
                                                }
                                            } else if (gameMode === 'wavelength') {
                                                roleColor = '#9D4EDD';
                                                iconName = "analytics-outline";
                                                let left = "Left", right = "Right", targetVal = 50;
                                                try {
                                                    const d = JSON.parse(myPlayer.secretWord || '{}');
                                                    left = d.left || 'Left';
                                                    right = d.right || 'Right';
                                                    targetVal = d.target !== undefined ? d.target : 50;
                                                } catch (e) { }
                                                if (myPlayer.role === 'psychic') {
                                                    roleTitle = "PSYCHIC";
                                                    secretLabelText = "YOUR TARGET";
                                                    secretDisplay = `${targetVal}%`;
                                                    hintText = `Give a clue that sits at ${targetVal}% between\n"${left}" and "${right}"`;
                                                } else {
                                                    roleTitle = "GUESSER";
                                                    secretLabelText = "THE SPECTRUM";
                                                    secretDisplay = "???";
                                                    hintText = `Spectrum:\n${left} <----------> ${right}\n\nDiscuss where the clue fits!`;
                                                }
                                            } else {
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
                                ) : (
                                    <View style={[styles.center, { flex: 1 }]}>
                                        <Text style={{ color: Colors.grayLight, fontSize: 14 }}>Waiting for reveal...</Text>
                                    </View>
                                )}
                            </View>

                            {gamePhase === 'discussion' && (
                                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                                    <Text style={styles.timerText}>
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </Text>
                                    <Text style={styles.timerLabel}>DISCUSSION TIME</Text>

                                    {gameMode === 'directors-cut' && myPlayer.role === 'director' && (
                                        <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 40, gap: 10 }}>
                                            <DirectorVerdictModal visible={guessVisible} onClose={() => setGuessVisible(false)} />
                                            <Button
                                                title="Select Winner"
                                                onPress={() => setGuessVisible(true)}
                                                variant="primary"
                                                icon={<Ionicons name="trophy" size={20} color="black" />}
                                            />
                                        </View>
                                    )}

                                    {gameMode === 'directors-cut' && myPlayer.role !== 'director' && (
                                        <View style={{ marginTop: 20 }}>
                                            <Text style={{ color: Colors.grayLight, fontStyle: 'italic', textAlign: 'center' }}>
                                                The Director is judging your guesses...
                                            </Text>
                                        </View>
                                    )}

                                    {isHost && gameMode !== 'directors-cut' && gameMode !== 'wavelength' && (
                                        <View style={{ marginTop: 10, width: '100%', paddingHorizontal: 40 }}>
                                            <Button
                                                title={gameMode === 'wavelength' ? "Reveal Target" : "Start Voting"}
                                                onPress={async () => {
                                                    if (roomCode) {
                                                        if (gameMode === 'wavelength') {
                                                            await GameAPI.revealWavelength(roomCode);
                                                        } else {
                                                            await GameAPI.updateGamePhase(roomCode, 'voting');
                                                        }
                                                    }
                                                }}
                                                variant="outline"
                                                icon={<Ionicons name={gameMode === 'wavelength' ? "eye-outline" : "finger-print"} size={20} color={Colors.parchment} />}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                </LinearGradient>

                <Modal visible={guessVisible && gameMode !== 'directors-cut'} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.guessCard}>
                            <Text style={styles.modalTitle}>Guess The Movie</Text>
                            <Text style={styles.modalSubtitle}>Type the full movie title to verify.</Text>
                            <TextInput
                                style={styles.guessInput}
                                placeholder="Movie Title..."
                                placeholderTextColor={Colors.grayLight}
                                value={guess}
                                onChangeText={setGuess}
                                autoFocus
                            />
                            <View style={styles.modalActions}>
                                <Button title="Cancel" variant="ghost" onPress={() => setGuessVisible(false)} />
                                <Button title="Verify" variant="primary" onPress={handleGuess} disabled={!guess} />
                            </View>
                        </View>
                    </View>
                </Modal>
            </View>
            <AlertComponent />
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
    scrollContent: {
        flexGrow: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 20,
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
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContainer: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        marginBottom: 40,
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
        marginTop: 20,
        marginBottom: 20,
    },
    timerText: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.parchment,
        textAlign: 'center',
        letterSpacing: 2,
        fontVariant: ['tabular-nums'],
    },
    timerLabel: {
        fontSize: 12,
        color: Colors.grayLight,
        textAlign: 'center',
        marginTop: 4,
        letterSpacing: 1,
        fontWeight: '700',
    },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
    guessCard: { backgroundColor: '#111', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: Colors.grayMedium, gap: 16 },
    modalTitle: { fontSize: 24, fontWeight: '800', color: Colors.parchment, textAlign: 'center' },
    modalSubtitle: { fontSize: 14, color: Colors.grayLight, textAlign: 'center' },
    guessInput: { backgroundColor: '#222', borderRadius: 12, height: 50, paddingHorizontal: 16, color: 'white', fontSize: 18, borderWidth: 1, borderColor: '#333' },
    modalActions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 10 },
});
