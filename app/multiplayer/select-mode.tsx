import { GameAPI } from '@/api/game';
import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { GAME_MODES, GameModeInfo } from '@/types/game';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SelectModeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showAlert, AlertComponent } = useCustomAlert();
    const { roomCode, isHost, players, setGameInfo, setPlayerRole } = useOnlineGameStore();
    const [selectedMode, setSelectedMode] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [showPlayerSelect, setShowPlayerSelect] = React.useState(false);
    const [selectedDirectorId, setSelectedDirectorId] = React.useState<string | null>(null);

    const handleBack = () => {
        if (showPlayerSelect) {
            setShowPlayerSelect(false);
            setSelectedDirectorId(null);
            return;
        }
        router.back();
    };

    const handleStartGame = async () => {
        if (!selectedMode || !roomCode) return;

        // Director's Cut / Wavelength: Specific flow to choose specialized role
        const specialModes = ['directors-cut', 'wavelength'];
        if (specialModes.includes(selectedMode) && !showPlayerSelect) {
            setShowPlayerSelect(true);
            return;
        }

        setLoading(true);

        const options: any = {};
        if (selectedMode === 'directors-cut' && selectedDirectorId) {
            options.directorId = selectedDirectorId;
        }
        if (selectedMode === 'wavelength' && selectedDirectorId) {
            options.psychicId = selectedDirectorId; // Reusing state variable
        }

        const { error } = await GameAPI.startGame(roomCode, selectedMode, options);
        if (error) {
            showAlert('Error', 'Failed to start game: ' + error);
        } else {
            // Optimistic Update
            if (selectedMode === 'directors-cut') {
                const directorId = options.directorId || players[Math.floor(Math.random() * players.length)].id;
                players.forEach(p => {
                    setPlayerRole(p.id, p.id === directorId ? 'director' : 'viewer');
                });
                setGameInfo('PLAYING', selectedMode, 'setup');
            } else if (selectedMode === 'wavelength') {
                const psychicId = options.psychicId || players[Math.floor(Math.random() * players.length)].id;
                players.forEach(p => {
                    setPlayerRole(p.id, p.id === psychicId ? 'psychic' : 'guesser');
                });
                setGameInfo('PLAYING', selectedMode, 'reveal');
            } else {
                setGameInfo('PLAYING', selectedMode, 'reveal');
            }
        }
        setLoading(false);
    };

    // Group modes
    const ALLOWED_MODES = ['wavelength', 'directors-cut'];
    const modes2Plus = GAME_MODES.filter(m => m.minPlayers === 2 && ALLOWED_MODES.includes(m.id));
    const modes3Plus = GAME_MODES.filter(m => m.minPlayers >= 3 && ALLOWED_MODES.includes(m.id));

    const renderModeItem = (mode: GameModeInfo, index: number) => {
        const disabled = players.length < mode.minPlayers;
        return (
            <TouchableOpacity
                key={mode.id}
                onPress={() => setSelectedMode(mode.id)}
                style={[
                    styles.modeCard,
                    selectedMode === mode.id && styles.modeCardSelected,
                    disabled && { opacity: 0.4 }
                ]}
                activeOpacity={0.8}
                disabled={disabled}
            >
                <View style={[styles.iconContainer, disabled && { backgroundColor: 'transparent' }]}>
                    <Ionicons name={mode.icon as any} size={24} color={selectedMode === mode.id ? Colors.victorianBlack : Colors.parchment} />
                </View>
                <View style={styles.modeInfo}>
                    <Text style={[styles.modeName, selectedMode === mode.id && styles.textSelected]}>
                        {mode.name}
                    </Text>
                    {disabled && (
                        <Text style={{ color: '#FF8C00', fontSize: 12, fontWeight: 'bold' }}>
                            Requires {mode.minPlayers}+ Players
                        </Text>
                    )}
                </View>
                <View style={styles.radio}>
                    {selectedMode === mode.id && <View style={styles.radioInner} />}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#0A0A0A', '#000000']}
                style={styles.gradient}
            >
                <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

                    {/* Header */}
                    <View style={styles.header}>
                        <Button
                            title=""
                            onPress={handleBack}
                            variant="ghost"
                            size="small"
                            icon={<Ionicons name="arrow-back" size={24} color={Colors.parchment} />}
                            style={styles.backButton}
                        />
                        <View style={{ flex: 1 }} />
                        <Button
                            title={showPlayerSelect ? "Start Game" : "Next"}
                            onPress={handleStartGame}
                            variant="primary"
                            size="small"
                            disabled={
                                (!selectedMode) ||
                                (showPlayerSelect && !selectedDirectorId) ||
                                loading
                            }
                            style={{ width: 100, opacity: (selectedMode && (!showPlayerSelect || selectedDirectorId)) ? 1 : 0.5 }}
                        />
                    </View>

                    <Animated.View key={showPlayerSelect ? 'select-director' : 'select-mode'} entering={FadeInDown.delay(100)} style={styles.titleContainer}>
                        <View style={styles.titleIcon}>
                            <Ionicons name={showPlayerSelect ? "person-outline" : "game-controller-outline"} size={32} color={Colors.parchment} />
                        </View>
                        <Text style={styles.title}>
                            {showPlayerSelect
                                ? (selectedMode === 'directors-cut' ? "Assign Director" : "Assign Psychic")
                                : "Select Mode"}
                        </Text>
                        <Text style={styles.subtitle}>
                            {showPlayerSelect
                                ? (selectedMode === 'directors-cut' ? "Who will choose the movie?" : "Who knows the wavelength?")
                                : "Choose Your Investigation Style"}
                        </Text>
                    </Animated.View>

                    {showPlayerSelect ? (
                        <View style={{ flex: 1 }}>
                            <FlatList
                                data={players}
                                keyExtractor={(p: any) => p.id}
                                contentContainerStyle={{ gap: 12, paddingBottom: 40 }}
                                renderItem={({ item }: { item: any }) => (
                                    <TouchableOpacity
                                        onPress={() => setSelectedDirectorId(item.id)}
                                        style={[
                                            styles.playerCard,
                                            selectedDirectorId === item.id && styles.playerCardSelected
                                        ]}
                                    >
                                        <View style={[styles.iconContainer,
                                        selectedDirectorId === item.id && { backgroundColor: 'transparent' }
                                        ]}>
                                            <Ionicons name="person" size={24} color={selectedDirectorId === item.id ? Colors.victorianBlack : Colors.parchment} />
                                        </View>
                                        <Text style={[styles.playerName, selectedDirectorId === item.id && styles.textSelected]}>
                                            {item.name}
                                        </Text>
                                        {selectedDirectorId === item.id && (
                                            <Ionicons name="checkmark-circle" size={24} color={Colors.victorianBlack} />
                                        )}
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    ) : (
                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                            <View style={styles.sectionHeader}>
                                <Ionicons name="copy-outline" size={18} color={Colors.parchment} />
                                <Text style={styles.sectionTitle}>2+ Players</Text>
                            </View>
                            <View style={styles.sectionList}>
                                {modes2Plus.map((mode, i) => renderModeItem(mode, i))}
                            </View>

                            <View style={styles.sectionHeader}>
                                <Ionicons name="layers-outline" size={18} color={Colors.parchment} />
                                <Text style={styles.sectionTitle}>3+ Players</Text>
                            </View>
                            <View style={styles.sectionList}>
                                {modes3Plus.map((mode, i) => renderModeItem(mode, i))}
                            </View>

                        </ScrollView>
                    )}

                </View>
            </LinearGradient>
            <AlertComponent />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    gradient: { flex: 1 },
    content: { flex: 1, paddingHorizontal: 20 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        marginBottom: 20,
    },
    backButton: { width: 44, height: 44, borderRadius: 22, paddingHorizontal: 0 },

    titleContainer: {
        alignItems: 'center',
        marginBottom: 30,
        gap: 8,
    },
    titleIcon: {
        marginBottom: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.parchment,
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.grayLight,
        fontStyle: 'italic',
    },

    scrollContent: {
        paddingBottom: 40,
        gap: 24,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingLeft: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.parchment,
        letterSpacing: 1,
    },
    sectionList: {
        gap: 12,
    },

    modeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#333',
        gap: 16,
    },
    modeCardSelected: {
        backgroundColor: Colors.parchment,
        borderColor: Colors.parchment,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeInfo: {
        flex: 1,
    },
    modeName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.parchment,
        marginBottom: 4,
    },
    textSelected: {
        color: Colors.victorianBlack,
    },
    modeDesc: {
        fontSize: 12,
        color: Colors.grayLight,
        lineHeight: 16,
    },

    radio: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: Colors.grayMedium,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: Colors.victorianBlack,
    },

    playerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111',
        padding: 16,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#333',
        gap: 16,
    },
    playerCardSelected: {
        backgroundColor: Colors.parchment,
        borderColor: Colors.parchment,
    },
    playerName: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.parchment,
        flex: 1,
    },
});
