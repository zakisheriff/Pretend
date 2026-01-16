
import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { directorsCut, getRandomMovie } from '@/data/game-modes';
import { useGameStore } from '@/store/gameStore';
import { DirectorsCutMovie } from '@/types/game';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useMemo, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, PanResponder, Platform, ScrollView, SectionList, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



type Step = 'choose-director' | 'choose-movie' | 'choose-timer';

export default function SetupDirectorScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const setDirector = useGameStore((s) => s.setDirector);
    const setDirectorMovie = useGameStore((s) => s.setDirectorMovie);
    const updateSettings = useGameStore((s) => s.updateSettings);
    const startGame = useGameStore((s) => s.startGame);
    const startDiscussion = useGameStore((s) => s.startDiscussion);

    const [step, setStep] = useState<Step>('choose-director');
    const [selectedDirectorId, setSelectedDirectorId] = useState<string | null>(null);
    const [movieName, setMovieName] = useState('');
    const [movieData, setMovieData] = useState<{ genre: string; hint: string } | null>(null);
    const [showBrowse, setShowBrowse] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedTime, setSelectedTime] = useState(180); // Default 3 mins

    const sectionListRef = useRef<SectionList>(null);

    // Group movies by alphabet
    const sections = useMemo(() => {
        let filtered = [...directorsCut];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter((m: any) =>
                m.movie.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q)
            );
        }

        // Sort alphabetically
        filtered.sort((a: any, b: any) => a.movie.localeCompare(b.movie));

        // Group by first letter
        const grouped: Record<string, any[]> = {};
        filtered.forEach((m: any) => {
            const letter = m.movie.charAt(0).toUpperCase();
            const key = /[A-Z]/.test(letter) ? letter : '#';
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(m);
        });

        // Convert to SectionList format
        const result = Object.keys(grouped).sort().map(key => ({
            title: key,
            data: grouped[key]
        }));

        // Move '#' to end if present
        const hashIndex = result.findIndex(s => s.title === '#');
        if (hashIndex > -1) {
            const hashSection = result.splice(hashIndex, 1)[0];
            result.push(hashSection);
        }

        return result;
    }, [searchQuery]);

    const alphabet = useMemo(() => sections.map(s => s.title), [sections]);

    // Refs to avoid stale closures in PanResponder
    const alphabetRef = useRef(alphabet);
    // Keep alphabet ref in sync
    React.useEffect(() => { alphabetRef.current = alphabet; }, [alphabet]);

    const handleScrollToSection = (index: number) => {
        if (index < 0 || index >= alphabetRef.current.length) return;

        sectionListRef.current?.scrollToLocation({
            sectionIndex: index,
            itemIndex: 0,
            animated: false,
            viewPosition: 0,
        });
    };

    // Sidebar Gesture Logic
    const lastScrollIndex = useRef<number>(-1);
    const sidebarContainerRef = useRef<View>(null);
    const sidebarLayout = useRef({ pageY: 0, height: 0 });

    const handleGesture = (y: number) => {
        const { pageY, height } = sidebarLayout.current;
        const letters = alphabetRef.current;

        if (!height || letters.length === 0) return;

        // Calculate relative Y from absolute screen coordinates
        const relativeY = y - pageY;
        const letterHeight = height / letters.length;

        let index = Math.floor(relativeY / letterHeight);

        // Clamp index to bounds
        if (index < 0) index = 0;
        if (index >= letters.length) index = letters.length - 1;

        if (index !== lastScrollIndex.current) {
            handleScrollToSection(index);
            lastScrollIndex.current = index;
            haptics.selection();
        }
    };

    const updateLayout = () => {
        sidebarContainerRef.current?.measure((x, y, width, height, pageX, pageY) => {
            sidebarLayout.current = { pageY, height };
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            // Prevent parent (Modal) from stealing the gesture
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt, gestureState) => {
                // Ensure layout is fresh on touch start
                updateLayout();
                // Use moveY (absolute) or y0 if moveY is 0 initially? 
                // grant usually provides y0. move provided moveY.
                handleGesture(gestureState.y0);
            },
            onPanResponderMove: (evt, gestureState) => {
                handleGesture(gestureState.moveY);
            },
        })
    ).current;

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

    const handleSelectFromBrowse = (movie: DirectorsCutMovie) => {
        haptics.medium();
        setMovieName(movie.movie);
        setMovieData({ genre: movie.genre, hint: movie.hint });
        setShowBrowse(false);
    };

    const handleConfirmMovie = () => {
        if (!movieName.trim()) return;
        haptics.medium();

        // Use movie data if name matches (wasn't edited to something else), otherwise Custom
        if (movieData && movieName === movieName) {
            setDirectorMovie(movieName.trim(), movieData.genre, movieData.hint);
        } else {
            setDirectorMovie(movieName.trim());
        }

        setStep('choose-timer');
    };

    const handleStartGame = () => {
        haptics.heavy();
        updateSettings({ discussionTime: selectedTime });
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
            <LinearGradient
                colors={[Colors.victorianBlack, Colors.victorianBlack, 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
            >
                <BackButton onPress={() => {
                    if (step === 'choose-timer') setStep('choose-movie');
                    else if (step === 'choose-movie') setStep('choose-director');
                    else router.back();
                }} />
            </LinearGradient>

            <ScrollView
                contentContainerStyle={[styles.content, { paddingTop: 80 }]}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
            >
                <View style={styles.header}>
                    <Ionicons
                        name={step === 'choose-director' ? 'videocam' : (step === 'choose-movie' ? 'film' : 'timer')}
                        size={32}
                        color={Colors.parchment}
                    />
                    <Text style={styles.title}>
                        {step === 'choose-director' ? 'Appoint Director' : (step === 'choose-movie' ? 'Select The Movie' : 'Set Timer')}
                    </Text>
                    <Text style={styles.subtitle}>
                        {step === 'choose-director'
                            ? 'Who Will Know The Secret Movie? '
                            : (step === 'choose-movie'
                                ? `Pick A Movie For Them To Guess!`
                                : 'How long should the interrogation last?')}
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
                ) : step === 'choose-movie' ? (
                    <TouchableWithoutFeedback onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}>
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
                                <Text style={styles.or}>or</Text>
                                <View style={styles.line} />
                            </View>

                            <View style={styles.buttonRow}>
                                <Button
                                    title="Random"
                                    onPress={AppointRandomMovie}
                                    variant="secondary"
                                    style={{ flex: 1 }}
                                    icon={<Ionicons name="dice" size={20} color={Colors.parchment} />}
                                />
                                <Button
                                    title="Browse List"
                                    onPress={() => { haptics.light(); setShowBrowse(true); }}
                                    variant="outline"
                                    style={{ flex: 1 }}
                                    icon={<Ionicons name="list" size={20} color={Colors.candlelight} />}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                ) : (
                    <View style={styles.timerList}>
                        {[60, 120, 180, 240, 300].map((time) => (
                            <TouchableOpacity
                                key={time}
                                style={[styles.timerOption, selectedTime === time && styles.timerOptionSelected]}
                                onPress={() => { haptics.selection(); setSelectedTime(time); }}
                            >
                                <Text style={[styles.timerText, selectedTime === time && styles.timerTextSelected]}>
                                    {time / 60} Minutes
                                </Text>
                                {selectedTime === time && (
                                    <Ionicons name="checkmark-circle" size={24} color={Colors.victorianBlack} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>

            <Modal visible={showBrowse} animationType="slide" presentationStyle="fullScreen">
                <TouchableWithoutFeedback onPress={() => Platform.OS !== 'web' && Keyboard.dismiss()}>
                    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Movie</Text>
                            <Button
                                title=""
                                onPress={() => setShowBrowse(false)}
                                variant="secondary"
                                icon={<Ionicons name="close" size={22} color={Colors.parchment} />}
                                style={{ width: 44, height: 44, borderRadius: 25, paddingHorizontal: 0, paddingVertical: 0, borderWidth: 1 }}
                            />
                        </View>

                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color={Colors.grayLight} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search movies..."
                                placeholderTextColor={Colors.grayLight}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                                autoCorrect={false}
                            />
                        </View>

                        <View style={{ flex: 1, flexDirection: 'row' }}>
                            <SectionList
                                ref={sectionListRef}
                                sections={sections}
                                keyExtractor={(item) => item.movie}
                                contentContainerStyle={styles.listContent}
                                stickySectionHeadersEnabled={false}
                                showsVerticalScrollIndicator={false}
                                keyboardDismissMode="on-drag"
                                keyboardShouldPersistTaps="handled"
                                renderSectionHeader={({ section: { title } }) => (
                                    <View style={styles.sectionHeader}>
                                        <Text style={styles.sectionValidation}>{title}</Text>
                                    </View>
                                )}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.movieItem} onPress={() => handleSelectFromBrowse(item as any)}>
                                        <View>
                                            <Text style={styles.movieItemTitle}>{item.movie}</Text>
                                            <Text style={styles.movieItemGenre}>{item.genre} • {item.year}</Text>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color={Colors.grayLight} />
                                    </TouchableOpacity>
                                )}
                            />

                            {/* Alphabet Sidebar */}
                            <View
                                style={styles.sidebar}
                                {...panResponder.panHandlers}
                            >
                                <View
                                    style={styles.sidebarContainer}
                                    ref={sidebarContainerRef}
                                    onLayout={updateLayout}
                                >
                                    {alphabet.map((letter, index) => (
                                        <View key={letter} style={styles.sidebarLetterContainer}>
                                            <Text style={styles.sidebarLetter}>{letter}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            <View style={styles.footer}>
                {step === 'choose-director' ? (
                    <Button
                        title="Next: Choose Movie"
                        onPress={handleConfirmDirector}
                        variant="primary"
                        disabled={!selectedDirectorId}
                        size="large"
                    />
                ) : step === 'choose-movie' ? (
                    <Button
                        title="Next: Set Timer"
                        onPress={handleConfirmMovie}
                        variant="primary"
                        disabled={!movieName.trim()}
                        size="large"
                    />
                ) : (
                    <Button
                        title="Start Game"
                        onPress={handleStartGame}
                        variant="primary"
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
    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
    },
    content: { flexGrow: 1, padding: 24, gap: 24 },

    header: { alignItems: 'center', gap: 8, marginBottom: 10 },
    title: { fontSize: 24, fontWeight: '800', color: Colors.parchment, letterSpacing: 1 },
    subtitle: { fontSize: 14, color: Colors.candlelight, textAlign: 'center', lineHeight: 20 },

    list: { gap: 12 },
    playerCard: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderRadius: 25,
        backgroundColor: Colors.grayDark,
        borderWidth: 1, borderColor: Colors.grayMedium,
        gap: 12,
    },
    playerCardSelected: {
        borderColor: Colors.candlelight,
        backgroundColor: Colors.gray,
    },
    avatar: {
        width: 40, height: 40, borderRadius: 25,
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
        borderWidth: 1, borderColor: Colors.candlelight,
        borderRadius: 25, height: 50, paddingHorizontal: 16,
        color: Colors.parchment, fontSize: 18, fontWeight: '600'
    },

    divider: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    line: { flex: 1, height: 1, backgroundColor: Colors.grayMedium },
    or: { color: Colors.grayLight, fontWeight: '700', fontSize: 12 },

    buttonRow: { flexDirection: 'row', gap: 12 },

    footer: { padding: 24, paddingTop: 0 },

    // Modal Styles
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: Colors.parchment },
    closeBtn: { padding: 4 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.grayDark, marginHorizontal: 20, marginBottom: 16,
        paddingHorizontal: 16, borderRadius: 25, height: 50, gap: 10, borderWidth: 1, borderColor: Colors.grayMedium
    },
    searchInput: { flex: 1, color: Colors.parchment, fontSize: 16, height: '100%' },
    listContent: { paddingHorizontal: 20, paddingBottom: 40 },
    movieItem: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.grayMedium
    },
    movieItemTitle: { fontSize: 16, color: Colors.parchment, fontWeight: '600' },
    movieItemGenre: { fontSize: 13, color: Colors.candlelight, marginTop: 2 },

    sectionHeader: {
        backgroundColor: Colors.victorianBlack, paddingVertical: 8, marginTop: 10, marginBottom: 5,
        borderBottomWidth: 1, borderBottomColor: Colors.grayMedium
    },
    sectionValidation: { fontSize: 18, fontWeight: '800', color: Colors.candlelight },

    sidebar: {
        width: 30, justifyContent: 'center', alignItems: 'center', paddingVertical: 20,
        backgroundColor: 'transparent', height: '100%'
    },
    sidebarContainer: {
        // Wrapper for actual letters to measure their height/position
    },

    // Timer Styles
    timerList: {
        gap: 12,
    },
    timerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: Colors.grayDark,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    timerOptionSelected: {
        backgroundColor: Colors.candlelight,
        borderColor: Colors.candlelight,
    },
    timerText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.parchment,
    },
    timerTextSelected: {
        color: Colors.victorianBlack,
        fontWeight: 'bold',
    },
    sidebarLetterContainer: { paddingVertical: 2, paddingHorizontal: 4 },
    sidebarLetter: { fontSize: 11, fontWeight: '700', color: Colors.candlelight },
});
