import { GameAPI } from '@/api/game';
import { Button, ThemeCard } from '@/components/game';
import { Colors } from '@/constants/colors';
import { categories, undercoverCategories } from '@/data/themes';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { GAME_MODES, GameModeInfo } from '@/types/game';
import { haptics } from '@/utils/haptics';
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
    const {
        roomCode, isHost, players, setGameInfo, setPlayerRole,
        gameMode: onlineMode, gamePhase: onlinePhase, selection, broadcastSelection,
        roomDeleted, leaveGame
    } = useOnlineGameStore();
    const [selectedMode, setSelectedMode] = React.useState<string | null>(null);
    const [loading, setLoading] = React.useState(false);
    const [showPlayerSelect, setShowPlayerSelect] = React.useState(false);
    const [selectedDirectorId, setSelectedDirectorId] = React.useState<string | null>(null);

    // Theme selection for classic-imposter and undercover-word modes
    const [showThemeSelect, setShowThemeSelect] = React.useState(false);
    const [selectedThemeIds, setSelectedThemeIds] = React.useState<string[]>([]);
    const [hintLevel, setHintLevel] = React.useState<'none' | 'low' | 'medium'>('low');

    // Get the appropriate categories based on mode
    const getThemeCategories = () => {
        if (selectedMode === 'classic-imposter') return undercoverCategories;
        if (selectedMode === 'undercover-word') return categories;
        return [];
    };

    const toggleTheme = (themeId: string) => {
        if (!isHost) return;

        const newSelection = selectedThemeIds.includes(themeId)
            ? selectedThemeIds.filter(id => id !== themeId)
            : [...selectedThemeIds, themeId];

        setSelectedThemeIds(newSelection);
        haptics.selection();
        broadcastSelection({ type: 'themes', id: null, data: newSelection });
    };

    const toggleAllThemes = () => {
        if (!isHost) return;
        const allThemes = getThemeCategories().flatMap(c => c.themes.map(t => t.id));
        const allSelected = allThemes.every(id => selectedThemeIds.includes(id));

        const newSelection = allSelected ? [] : allThemes;
        setSelectedThemeIds(newSelection);
        haptics.selection();
        broadcastSelection({ type: 'themes', id: null, data: newSelection });
    };

    // Sync state for spectators
    React.useEffect(() => {
        if (!isHost) {
            if (onlineMode) setSelectedMode(onlineMode);

            // Sync Phase UI
            const isSelectingPlayer = onlinePhase === 'SELECT_DIRECTOR' || onlinePhase === 'SELECT_PSYCHIC' || onlinePhase === 'SETUP_DIRECTOR:PLAYER';
            setShowPlayerSelect(isSelectingPlayer);

            const isSelectingTheme = onlinePhase === 'SELECT_THEME';
            setShowThemeSelect(isSelectingTheme);

            // Sync selection via broadcast
            if (selection) {
                if (selection.type === 'mode') setSelectedMode(selection.id);
                if (selection.type === 'player') setSelectedDirectorId(selection.id);
                if (selection.type === 'themes') setSelectedThemeIds(selection.data || []);
                if (selection.type === 'hint_level') setHintLevel(selection.id as any);
            }
        }
    }, [isHost, onlineMode, onlinePhase, selection]);

    React.useEffect(() => {
        if (roomDeleted) {
            leaveGame();
            router.replace('/');
        }
    }, [roomDeleted]);

    const handleModeSelect = (modeId: string) => {
        if (!isHost) return;
        setSelectedMode(modeId);
        GameAPI.updateGameMode(roomCode!, modeId);
        broadcastSelection({ type: 'mode', id: modeId });
    };

    const handlePlayerSelect = (playerId: string) => {
        if (!isHost) return;
        setSelectedDirectorId(playerId);
        broadcastSelection({ type: 'player', id: playerId });
    };

    const handleBack = () => {
        if (!isHost) return;
        if (showPlayerSelect) {
            setShowPlayerSelect(false);
            setSelectedDirectorId(null);
            GameAPI.updateGamePhase(roomCode!, 'SELECT_MODE');
            broadcastSelection({ type: 'player', id: null });
            return;
        }
        if (showThemeSelect) {
            setShowThemeSelect(false);
            setSelectedThemeIds([]);
            setHintLevel('low');
            GameAPI.updateGamePhase(roomCode!, 'SELECT_MODE');
            return;
        }
        router.back();
    };

    const handleStartGame = async () => {
        if (!isHost || !selectedMode || !roomCode) return;

        // Director's Cut / Wavelength: Specific flow to choose specialized role
        const specialModes = ['directors-cut', 'wavelength'];
        if (specialModes.includes(selectedMode) && !showPlayerSelect) {
            setShowPlayerSelect(true);
            const nextPhase = selectedMode === 'directors-cut' ? 'SELECT_DIRECTOR' : 'SELECT_PSYCHIC';
            GameAPI.updateGamePhase(roomCode, nextPhase);
            return;
        }

        // Undercover/Imposter modes: Theme selection step
        const themeSelectModes = ['classic-imposter', 'undercover-word'];
        if (themeSelectModes.includes(selectedMode) && !showThemeSelect) {
            setShowThemeSelect(true);
            GameAPI.updateGamePhase(roomCode, 'SELECT_THEME');
            return;
        }

        // Require at least one theme for these modes
        if (themeSelectModes.includes(selectedMode) && selectedThemeIds.length === 0) {
            haptics.warning();
            showAlert('Select Themes', 'Please select at least one theme to continue.');
            return;
        }

        // Pictionary Mode: Starts immediately (Role assignment happens in API)
        if (selectedMode === 'pictionary') {
            setLoading(true);
            const { error } = await GameAPI.startGame(roomCode, selectedMode, {});
            if (error) {
                showAlert('Error', 'Failed to start game: ' + error);
            }
            setLoading(false);
            return;
        }

        setLoading(true);
        const options: any = {};
        if (selectedMode === 'directors-cut' && selectedDirectorId) {
            options.directorId = selectedDirectorId;
        }
        if (selectedMode === 'wavelength' && selectedDirectorId) {
            options.psychicId = selectedDirectorId;
        }
        // Pass theme and hint options for undercover/imposter modes
        if (themeSelectModes.includes(selectedMode)) {
            options.themeIds = selectedThemeIds;
            if (selectedMode === 'undercover-word') {
                options.hintLevel = hintLevel;
            }
        }

        const { error } = await GameAPI.startGame(roomCode, selectedMode, options);
        if (error) {
            showAlert('Error', 'Failed to start game: ' + error);
        }
        setLoading(false);
    };

    // Group modes
    const ALLOWED_MODES = ['wavelength', 'directors-cut', 'pictionary', 'mind-sync', 'classic-imposter', 'undercover-word'];
    const modes2Plus = GAME_MODES.filter(m => m.minPlayers === 2 && ALLOWED_MODES.includes(m.id));
    const modes3Plus = GAME_MODES.filter(m => m.minPlayers >= 3 && ALLOWED_MODES.includes(m.id));

    const renderModeItem = (mode: GameModeInfo, index: number) => {
        const disabledByPlayers = players.length < mode.minPlayers;
        const isDisabled = !isHost || disabledByPlayers;

        return (
            <TouchableOpacity
                key={mode.id}
                onPress={() => handleModeSelect(mode.id)}
                style={[
                    styles.modeCard,
                    selectedMode === mode.id && styles.modeCardSelected,
                    disabledByPlayers && { opacity: 0.4 }
                ]}
                activeOpacity={isDisabled ? 1 : 0.8}
                disabled={isDisabled}
            >
                <View style={[styles.iconContainer, disabledByPlayers && { backgroundColor: 'transparent' }]}>
                    <Ionicons name={mode.icon as any} size={24} color={selectedMode === mode.id ? Colors.victorianBlack : Colors.parchment} />
                </View>
                <View style={styles.modeInfo}>
                    <Text style={[styles.modeName, selectedMode === mode.id && styles.textSelected]}>
                        {mode.name}
                    </Text>
                    {disabledByPlayers && (
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

    // Verify access
    React.useEffect(() => {
        if (!roomCode) {
            router.replace('/multiplayer/lobby');
            return;
        }

        // Host sets the phase
        if (isHost) {
            GameAPI.updateGamePhase(roomCode, 'SELECT_MODE');
        }
    }, []);

    // Spectator Navigation Logic
    // ... remove this as we now stay on screen ...

    // UI rendering for everyone below

    return (
        <View style={styles.container}>
            {/* Absolute Header with blur-like gradient */}
            <LinearGradient
                colors={['#000000', 'rgba(0,0,0,0.8)', 'transparent']}
                locations={[0, 0.6, 1]}
                style={[styles.headerBar, { paddingTop: insets.top + 10 }]}
            >
                <Button
                    title=""
                    onPress={handleBack}
                    variant="ghost"
                    size="small"
                    icon={<Ionicons name="arrow-back" size={24} color={Colors.parchment} />}
                    style={styles.backButton}
                />

                <Button
                    title={(showPlayerSelect || showThemeSelect) ? "Start Game" : "Next"}
                    onPress={handleStartGame}
                    variant="primary"
                    size="small"
                    disabled={
                        (!selectedMode) ||
                        (showPlayerSelect && !selectedDirectorId) ||
                        (showThemeSelect && selectedThemeIds.length === 0) ||
                        loading
                    }
                    style={{ width: 110, opacity: (selectedMode && (!showPlayerSelect || selectedDirectorId) && (!showThemeSelect || selectedThemeIds.length > 0)) ? 1 : 0.5 }}
                />
            </LinearGradient>

            {/* Main Content Area */}
            {showThemeSelect ? (
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}
                >
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.titleContainer}>
                        <View style={styles.titleIcon}>
                            <Ionicons name="folder-open-outline" size={32} color={Colors.parchment} />
                        </View>
                        <Text style={styles.title}>Select Themes</Text>
                        <Text style={styles.subtitle}>Choose one or more categories</Text>

                        {isHost && (
                            <TouchableOpacity
                                onPress={toggleAllThemes}
                                style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20 }}
                            >
                                <Text style={{ color: Colors.parchment, fontSize: 13, fontWeight: '600' }}>
                                    {getThemeCategories().flatMap(c => c.themes.map(t => t.id)).every(id => selectedThemeIds.includes(id))
                                        ? "Deselect All"
                                        : "Select All"}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {!isHost && (
                            <Text style={{ marginTop: 8, color: Colors.candlelight, fontSize: 12, fontStyle: 'italic' }}>
                                Host is selecting themes...
                            </Text>
                        )}
                    </Animated.View>

                    {/* Hint Level Selector - Only for undercover-word (Imposter mode) */}
                    {selectedMode === 'undercover-word' && (
                        <View style={styles.hintSection}>
                            <Text style={styles.hintSectionTitle}>Hint Level for Imposter</Text>
                            <View style={styles.hintOptions}>
                                {(['none', 'low', 'medium'] as const).map((level) => (
                                    <TouchableOpacity
                                        key={level}
                                        style={[
                                            styles.hintOption,
                                            hintLevel === level && styles.hintOptionSelected
                                        ]}
                                        onPress={() => {
                                            if (!isHost) return;
                                            setHintLevel(level);
                                            haptics.selection();
                                            broadcastSelection({ type: 'hint_level', id: level });
                                        }}
                                        disabled={!isHost}
                                    >
                                        <Text style={[
                                            styles.hintOptionText,
                                            hintLevel === level && styles.hintOptionTextSelected
                                        ]}>
                                            {level === 'none' ? 'None' : level === 'low' ? 'Low' : 'Medium'}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.hintDescription}>
                                {hintLevel === 'none'
                                    ? "Imposter gets NO hint - hardest mode!"
                                    : hintLevel === 'low'
                                        ? "Imposter gets a vague hint"
                                        : "Imposter gets a helpful hint"}
                            </Text>
                        </View>
                    )}

                    {/* Theme Categories */}
                    {getThemeCategories().map((cat) => (
                        <View key={cat.id} style={styles.themeSection}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name={cat.icon as any} size={18} color={Colors.candlelight} />
                                <Text style={styles.sectionTitle}>{cat.name}</Text>
                            </View>
                            <View style={styles.themeGrid}>
                                {cat.themes.map((theme) => (
                                    <ThemeCard
                                        key={theme.id}
                                        id={theme.id}
                                        name={theme.name}
                                        icon={theme.icon}
                                        isSelected={selectedThemeIds.includes(theme.id)}
                                        onSelect={() => toggleTheme(theme.id)}
                                    />
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            ) : showPlayerSelect ? (
                <View style={{ flex: 1 }}>
                    <FlatList
                        data={players}
                        keyExtractor={(p: any) => p.id}
                        contentContainerStyle={{ gap: 12, paddingTop: insets.top + 80, paddingBottom: 40, paddingHorizontal: 20 }}
                        ListHeaderComponent={
                            <Animated.View entering={FadeInDown.delay(100)} style={styles.titleContainer}>
                                <View style={styles.titleIcon}>
                                    <Ionicons name="person-outline" size={32} color={Colors.parchment} />
                                </View>
                                <Text style={styles.title}>
                                    {selectedMode === 'directors-cut' ? "Assign Director" : "Assign Psychic"}
                                </Text>
                                <Text style={styles.subtitle}>
                                    {selectedMode === 'directors-cut' ? "Who will choose the movie?" : "Who knows the wavelength?"}
                                </Text>
                            </Animated.View>
                        }
                        renderItem={({ item }: { item: any }) => (
                            <TouchableOpacity
                                onPress={() => handlePlayerSelect(item.id)}
                                style={[
                                    styles.playerCard,
                                    selectedDirectorId === item.id && styles.playerCardSelected
                                ]}
                                disabled={!isHost}
                                activeOpacity={isHost ? 0.7 : 1}
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
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}
                >
                    <Animated.View entering={FadeInDown.delay(100)} style={styles.titleContainer}>
                        <View style={styles.titleIcon}>
                            <Ionicons name="game-controller-outline" size={32} color={Colors.parchment} />
                        </View>
                        <Text style={styles.title}>Select Mode</Text>
                        <Text style={styles.subtitle}>Choose Your Investigation Style</Text>
                    </Animated.View>

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

                    {!isHost && (
                        <View style={styles.spectatorBanner}>
                            <Ionicons name="eye" size={16} color={Colors.candlelight} />
                            <Text style={styles.spectatorBannerText}>
                                YOU ARE A SPECTATOR • ONLY THE HOST CAN SELECT
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

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

    headerBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingBottom: 20,
        zIndex: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        width: '100%',
        maxWidth: 500,
        alignSelf: 'center',
        paddingHorizontal: 20,
        paddingBottom: 40,
        gap: 24,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
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
    spectatorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginTop: 20,
        marginBottom: 40,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    spectatorBannerText: {
        color: Colors.candlelight,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        textAlign: 'center',
        flexShrink: 1
    },

    // Theme selection styles
    themeSection: {
        marginBottom: 24,
    },
    themeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },

    // Hint level selection styles
    hintSection: {
        backgroundColor: 'rgba(255, 215, 0, 0.08)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    hintSectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.candlelight,
        marginBottom: 12,
        textAlign: 'center',
    },
    hintOptions: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    hintOption: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    hintOptionSelected: {
        backgroundColor: Colors.parchment,
        borderColor: Colors.parchment,
    },
    hintOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.parchment,
    },
    hintOptionTextSelected: {
        color: Colors.victorianBlack,
    },
    hintDescription: {
        fontSize: 12,
        color: Colors.grayLight,
        textAlign: 'center',
        marginTop: 12,
        fontStyle: 'italic',
    },
});
