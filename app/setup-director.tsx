
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { getRandomMovie } from '@/data/game-modes';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Step = 'choose-director' | 'choose-movie';

export default function SetupDirectorScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const setDirector = useGameStore((s) => s.setDirector);
    const setDirectorMovie = useGameStore((s) => s.setDirectorMovie);
    const startGame = useGameStore((s) => s.startGame);
    const startDiscussion = useGameStore((s) => s.startDiscussion);

    const [step, setStep] = useState<Step>('choose-director');
    const [selectedDirectorId, setSelectedDirectorId] = useState<string | null>(null);
    const [movieName, setMovieName] = useState('');
    const [movieData, setMovieData] = useState<{ genre: string; hint: string } | null>(null);

    const handleSelectDirector = (id: string) => {
        haptics.light();
        setSelectedDirectorId(id);
    };

    const handleRandomDirector = () => {
        haptics.medium();
        const randomInfo = players[Math.floor(Math.random() * players.length)];
        setSelectedDirectorId(randomInfo.id);
    };

    const handleConfirmDirector = () => {
        if (!selectedDirectorId) return;
        haptics.medium();
        setDirector(selectedDirectorId);
        setStep('choose-movie');
    };

    const AppointRandomMovie = () => {
        const movie = getRandomMovie();
        if (movie) {
            haptics.medium();
            setMovieName(movie.movie);
            setMovieData({ genre: movie.genre, hint: movie.hint });
        }
    };

    const handleStartGame = () => {
        if (!movieName.trim()) return;
        haptics.heavy();

        // Use movie data if name matches (wasn't edited to something else), otherwise Custom
        if (movieData && movieName === movieName) { // logic check handled by state sync mostly
            setDirectorMovie(movieName.trim(), movieData.genre, movieData.hint);
        } else {
            setDirectorMovie(movieName.trim());
        }

        startGame();
        startDiscussion(); // Skip reveal
        router.push('/discussion');
    };

    const directorName = players.find(p => p.id === selectedDirectorId)?.name;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
        >
            <View style={styles.headerBar}>
                <BackButton onPress={() => {
                    if (step === 'choose-movie') setStep('choose-director');
                    else router.back();
                }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                <View style={styles.header}>
                    <Ionicons
                        name={step === 'choose-director' ? 'videocam' : 'film'}
                        size={32}
                        color={Colors.parchment}
                    />
                    <Text style={styles.title}>
                        {step === 'choose-director' ? 'Appoint Director' : 'Select The Movie'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'choose-director'
                            ? 'Who will know the secret movie?'
                            : `${directorName}, pick a movie for them to guess!`}
                    </Text>
                </View>

                {step === 'choose-director' ? (
                    <View style={styles.list}>
                        {players.map((p) => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.playerCard, selectedDirectorId === p.id && styles.playerCardSelected]}
                                onPress={() => handleSelectDirector(p.id)}
                            >
                                <View style={[styles.avatar, selectedDirectorId === p.id && styles.avatarSelected]}>
                                    <Text style={[styles.initial, selectedDirectorId === p.id && styles.initialSelected]}>
                                        {p.name.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={[styles.name, selectedDirectorId === p.id && styles.nameSelected]}>
                                    {p.name}
                                </Text>
                                {selectedDirectorId === p.id && (
                                    <Ionicons name="checkmark-circle" size={24} color={Colors.parchment} />
                                )}
                            </TouchableOpacity>
                        ))}

                        <Button
                            title="Randomize"
                            onPress={handleRandomDirector}
                            variant="secondary"
                            icon={<Ionicons name="shuffle" size={20} color={Colors.parchment} />}
                            style={{ marginTop: 10 }}
                        />
                    </View>
                ) : (
                    <View style={styles.movieSection}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Custom Movie Name</Text>
                            <TextInput
                                style={styles.input}
                                value={movieName}
                                onChangeText={setMovieName}
                                placeholder="e.g. Inception"
                                placeholderTextColor={Colors.grayLight}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={styles.divider}>
                            <View style={styles.line} />
                            <Text style={styles.or}>OR</Text>
                            <View style={styles.line} />
                        </View>

                        <Button
                            title="Pick Random Movie"
                            onPress={AppointRandomMovie}
                            variant="secondary"
                            icon={<Ionicons name="dice" size={20} color={Colors.parchment} />}
                        />
                    </View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                {step === 'choose-director' ? (
                    <Button
                        title="Next: Choose Movie"
                        onPress={handleConfirmDirector}
                        variant="primary"
                        disabled={!selectedDirectorId}
                        size="large"
                    />
                ) : (
                    <Button
                        title="Start Game"
                        onPress={handleStartGame}
                        variant="primary"
                        disabled={!movieName.trim()}
                        size="large"
                        icon={<Ionicons name="play" size={20} color={Colors.victorianBlack} />}
                    />
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    headerBar: { paddingHorizontal: 20, paddingTop: 10, zIndex: 10 },
    content: { flexGrow: 1, padding: 24, gap: 24 },

    header: { alignItems: 'center', gap: 8, marginBottom: 10 },
    title: { fontSize: 24, fontWeight: '800', color: Colors.parchment, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: Colors.candlelight, textAlign: 'center', lineHeight: 20 },

    list: { gap: 12 },
    playerCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderRadius: 16,
        backgroundColor: Colors.grayDark,
        borderWidth: 1.5, borderColor: Colors.grayMedium,
        gap: 12,
    },
    playerCardSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: Colors.gray,
    },
    avatar: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: Colors.gray, alignItems: 'center', justifyContent: 'center'
    },
    avatarSelected: {
        backgroundColor: Colors.parchmentLight,
    },
    initial: { fontSize: 16, fontWeight: '700', color: Colors.parchmentLight },
    initialSelected: { color: Colors.victorianBlack },
    name: { flex: 1, fontSize: 16, color: Colors.parchment, fontWeight: '600' },
    nameSelected: { color: Colors.parchment },

    movieSection: { gap: 24 },
    inputContainer: { gap: 10 },
    label: { color: Colors.candlelight, fontSize: 14, fontWeight: '700', letterSpacing: 1 },
    input: {
        backgroundColor: Colors.grayDark,
        borderWidth: 1.5, borderColor: Colors.candlelight,
        borderRadius: 16, padding: 16,
        color: Colors.parchment, fontSize: 18, fontWeight: '600'
    },

    divider: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    line: { flex: 1, height: 1, backgroundColor: Colors.grayMedium },
    or: { color: Colors.grayLight, fontWeight: '700', fontSize: 12 },

    footer: { padding: 24, paddingTop: 0 },
});
