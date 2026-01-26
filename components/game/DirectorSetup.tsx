import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import directorsCut from '@/data/modes/directors-cut.json'; // Importing JSON
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
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
    onConfirm: (movieJson: string) => void;
}

export const DirectorSetup = ({ onConfirm }: DirectorSetupProps) => {
    const [step, setStep] = useState<'choose-movie' | 'confirm'>('choose-movie');
    const [movieName, setMovieName] = useState('');
    const [movieData, setMovieData] = useState<{ genre: string; hint: string, year: number } | null>(null);
    const [showBrowse, setShowBrowse] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter movies
    const filteredMovies = useMemo(() => {
        if (!searchQuery) return directorsCut;
        const q = searchQuery.toLowerCase();
        return directorsCut.filter((m: any) =>
            m.movie.toLowerCase().includes(q) || m.genre.toLowerCase().includes(q)
        );
    }, [searchQuery]);

    const handleRandomMovie = () => {
        const random = directorsCut[Math.floor(Math.random() * directorsCut.length)];
        selectMovie(random);
    };

    const selectMovie = (m: any) => {
        setMovieName(m.movie);
        setMovieData({ genre: m.genre, hint: m.hint, year: m.year });
        setShowBrowse(false);
    };

    const handleConfirm = () => {
        if (!movieName) return;

        const payload = {
            title: movieName,
            genre: movieData?.genre || 'Custom',
            year: movieData?.year || new Date().getFullYear(),
            hint: movieData?.hint || ''
        };

        onConfirm(JSON.stringify(payload));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="videocam" size={48} color={Colors.parchment} />
                <Text style={styles.title}>YOU ARE THE DIRECTOR</Text>
                <Text style={styles.subtitle}>Choose a movie for the audience to guess.</Text>
            </View>

            <View style={styles.inputCard}>
                <Text style={styles.label}>MOVIE TITLE</Text>
                <TextInput
                    style={styles.input}
                    value={movieName}
                    onChangeText={(t) => {
                        setMovieName(t);
                        setMovieData(null); // Reset data if typing custom
                    }}
                    placeholder="e.g. Inception"
                    placeholderTextColor={Colors.grayLight}
                />
            </View>

            <View style={styles.actions}>
                <Button
                    title="Random Movie"
                    onPress={handleRandomMovie}
                    variant="secondary"
                    icon={<Ionicons name="shuffle" size={20} color={Colors.parchment} />}
                />
                <Button
                    title="Browse List"
                    onPress={() => setShowBrowse(true)}
                    variant="outline"
                    icon={<Ionicons name="list" size={20} color={Colors.parchment} />}
                />
            </View>

            <View style={styles.footer}>
                <Button
                    title="Confirm Movie"
                    onPress={handleConfirm}
                    variant="primary"
                    disabled={!movieName.trim()}
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
                        keyExtractor={(item) => item.movie}
                        renderItem={({ item }) => (
                            <TouchableOpacity style={styles.movieItem} onPress={() => selectMovie(item)}>
                                <Text style={styles.movieTitle}>{item.movie}</Text>
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
        borderRadius: 16, height: 56, paddingHorizontal: 16,
        color: Colors.parchment, fontSize: 20, fontWeight: '600'
    },

    actions: { flexDirection: 'row', gap: 12 },
    footer: { marginTop: 12 },

    // Modal
    modalContainer: { flex: 1, backgroundColor: '#111', padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.parchment },
    searchInput: {
        backgroundColor: '#222', borderRadius: 12, height: 48, paddingHorizontal: 16,
        color: 'white', marginBottom: 16
    },
    movieItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
    movieTitle: { fontSize: 18, color: 'white', fontWeight: '600' },
    movieSub: { fontSize: 14, color: '#888', marginTop: 4 }
});
