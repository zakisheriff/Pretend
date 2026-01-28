import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { MOVIES } from '@/constants/movies';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
    FlatList,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

interface DirectorSetupProps {
    onConfirm: (movieJson: string) => Promise<void>;
    isReadOnly?: boolean;
}

export const DirectorSetup = ({ onConfirm, isReadOnly = false }: DirectorSetupProps) => {
    const { selection, broadcastSelection } = useOnlineGameStore();
    const [movieName, setMovieName] = useState('');
    const [movieData, setMovieData] = useState<{ genre: string; year: number } | null>(null);
    const [showBrowse, setShowBrowse] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [timerDuration, setTimerDuration] = useState(120); // Default 2 mins
    const [loading, setLoading] = useState(false);

    // Sync from selection (spectator side)
    useEffect(() => {
        if (isReadOnly && selection) {
            if (selection.type === 'movie' && selection.id) {
                setMovieName(selection.id);
                setMovieData(selection.data);
            } else if (selection.type === 'timer' && selection.id) {
                setTimerDuration(Number(selection.id) || 120);
            }
        }
    }, [selection, isReadOnly]);

    // Broadcast changes (director side)
    useEffect(() => {
        if (!isReadOnly && movieName) {
            broadcastSelection({ type: 'movie', id: movieName, data: movieData });
        }
    }, [movieName, movieData, isReadOnly]);

    useEffect(() => {
        if (!isReadOnly && timerDuration) {
            broadcastSelection({ type: 'timer', id: timerDuration as any });
        }
    }, [timerDuration, isReadOnly]);

    // Filter movies
    const filteredMovies = useMemo(() => {
        if (!searchQuery) return MOVIES;
        const q = searchQuery.toLowerCase();
        return MOVIES.filter((m) =>
            m.title.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const handleRandomMovie = () => {
        if (loading) return;
        const random = MOVIES[Math.floor(Math.random() * MOVIES.length)];
        selectMovie(random);
    };

    const selectMovie = (m: typeof MOVIES[0]) => {
        if (loading) return;
        setMovieName(m.title);
        setMovieData({ genre: m.genre, year: m.year });
        setShowBrowse(false);
    };

    const handleConfirm = async () => {
        if (!movieName || loading) return;

        setLoading(true);
        const startTime = Date.now();

        try {
            const payload = {
                title: movieName,
                genre: movieData?.genre || 'Custom',
                year: movieData?.year || new Date().getFullYear(),
                timer: timerDuration
            };

            await onConfirm(JSON.stringify(payload));

            // Ensure minimum 500ms loading
            const elapsed = Date.now() - startTime;
            if (elapsed < 500) {
                await new Promise(resolve => setTimeout(resolve, 500 - elapsed));
            }
        } finally {
            setLoading(false);
        }
    };

    if (isReadOnly) {
        return (
            <View style={[styles.container, { justifyContent: 'center', minHeight: 300 }]}>
                <View style={styles.header}>
                    <Ionicons name="videocam" size={64} color={Colors.parchment} style={{ opacity: 0.8, marginBottom: 10 }} />
                    <Text style={styles.title}>SPECTATING SETUP</Text>
                    <Text style={styles.subtitle}>
                        The director is choosing a movie for the audience to guess.
                    </Text>
                </View>

                <View style={styles.spectatorBanner}>
                    <Ionicons name="eye" size={16} color={Colors.candlelight} />
                    <Text style={styles.spectatorBannerText}>
                        YOU ARE A SPECTATOR • ONLY THE DIRECTOR CAN CHOOSE
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="videocam" size={48} color={Colors.parchment} />
                <Text style={styles.title}>YOU ARE THE DIRECTOR</Text>
                <Text style={styles.subtitle}>
                    Choose a movie for the audience to guess.
                </Text>
            </View>

            <View style={styles.inputCard}>
                <Text style={styles.label}>MOVIE TITLE</Text>
                <TextInput
                    style={[styles.input, loading && { opacity: 0.6 }]}
                    value={movieName}
                    onChangeText={(t) => {
                        setMovieName(t);
                        setMovieData(null);
                    }}
                    placeholder="e.g. Inception"
                    placeholderTextColor={Colors.grayLight}
                    editable={!loading}
                />
            </View>

            <View style={styles.inputCard}>
                <Text style={styles.label}>DISCUSSION TIMER</Text>
                <View style={styles.timerRow}>
                    {[60, 120, 180, 300].map(t => (
                        <TouchableOpacity
                            key={t}
                            onPress={() => !loading && setTimerDuration(t)}
                            style={[
                                styles.timerOption,
                                timerDuration === t && styles.timerOptionSelected,
                                loading && { opacity: 0.6 }
                            ]}
                            disabled={loading}
                        >
                            <Text style={[styles.timerOptionText, timerDuration === t && styles.timerOptionTextSelected]}>
                                {t / 60}m
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.actions}>
                <Button
                    title="Random Movie"
                    onPress={handleRandomMovie}
                    variant="secondary"
                    icon={<Ionicons name="shuffle" size={20} color={Colors.parchment} />}
                    disabled={loading}
                />
                <Button
                    title="Browse List"
                    onPress={() => setShowBrowse(true)}
                    variant="outline"
                    icon={<Ionicons name="list" size={20} color={Colors.parchment} />}
                    disabled={loading}
                />
            </View>

            <View style={styles.footer}>
                <Button
                    title="Confirm Movie"
                    onPress={handleConfirm}
                    variant="primary"
                    disabled={!movieName.trim() || loading}
                    loading={loading}
                    size="large"
                />
            </View>

            {/* Browse Modal */}
            <Modal visible={showBrowse} animationType="slide" presentationStyle="formSheet">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Select Movie</Text>
                        <TouchableOpacity onPress={() => setShowBrowse(false)}>
                            <Ionicons name="close-circle" size={32} color={Colors.grayLight} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search..."
                        placeholderTextColor={Colors.grayLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />

                    <FlatList
                        data={filteredMovies}
                        keyExtractor={(item) => item.title}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.movieItem} onPress={() => selectMovie(item)}>
                                <Text style={styles.movieTitle}>{item.title}</Text>
                                <Text style={styles.movieSub}>{item.genre} • {item.year}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { width: '100%', gap: 24, paddingHorizontal: 0 },
    header: { alignItems: 'center', gap: 8 },
    title: { fontSize: 24, fontWeight: '800', color: Colors.parchment, letterSpacing: 1, textAlign: 'center' },
    subtitle: { fontSize: 14, color: Colors.candlelight, textAlign: 'center' },

    inputCard: { gap: 8 },
    label: { fontSize: 12, fontWeight: '700', color: Colors.grayLight, letterSpacing: 1 },
    input: {
        backgroundColor: '#1A1A1A',
        borderWidth: 1, borderColor: Colors.candlelight,
        borderRadius: 25, height: 56, paddingHorizontal: 16,
        color: Colors.parchment, fontSize: 20, fontWeight: '600'
    },

    actions: { flexDirection: 'row', gap: 12 },
    footer: { marginTop: 12 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#111', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.parchment },
    searchInput: {
        backgroundColor: '#222', borderRadius: 25, paddingHorizontal: 16,
        paddingVertical: 12, // Explicit padding
        color: 'white', marginBottom: 16,
        fontSize: 16,
        textAlignVertical: 'center' // Android center
    },
    movieItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    movieTitle: { fontSize: 18, color: 'white', fontWeight: '600' },
    movieSub: { fontSize: 14, color: '#888', marginTop: 4 },

    timerRow: { flexDirection: 'row', gap: 12 },
    timerOption: {
        flex: 1, height: 48, borderRadius: 12, borderWidth: 1, borderColor: '#333',
        alignItems: 'center', justifyContent: 'center', backgroundColor: '#111'
    },
    timerOptionSelected: { backgroundColor: Colors.parchment, borderColor: Colors.parchment },
    timerOptionText: { color: Colors.grayLight, fontWeight: '700', fontSize: 16 },
    timerOptionTextSelected: { color: Colors.victorianBlack },

    spectatorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 20, // Added padding
        borderRadius: 16,
        marginTop: 20,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    spectatorBannerText: {
        color: Colors.candlelight,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center', // Center text
        flexShrink: 1 // Allow text to shrink/wrap if needed
    },
});
