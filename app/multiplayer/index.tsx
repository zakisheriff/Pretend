import { GameAPI } from '@/api/game';
import { Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useCustomAlert } from '@/hooks/useCustomAlert';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableWithoutFeedback, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MultiplayerScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { showAlert, AlertComponent } = useCustomAlert(); // Hook

    const [isJoining, setIsJoining] = React.useState(false);
    const [roomCode, setRoomCode] = React.useState('');
    const [name, setName] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const [isFocused, setIsFocused] = React.useState(false);

    const handleBack = () => {
        router.back();
    };

    const handleHostGame = async () => {
        if (!name.trim()) {
            showAlert('Name Required', 'Please enter your name.');
            return;
        }
        setLoading(true);
        const { room, player, error } = await GameAPI.createRoom(name.trim(), 'undercover-word');

        if (error) {
            showAlert('Error', 'Failed to create room: ' + error.message);
            setLoading(false);
            return;
        }

        if (room && player) {
            useOnlineGameStore.getState().setRoomInfo(room.code, true, player.id, player);
            router.push('/multiplayer/lobby');
        }
        setLoading(false);
    };

    const handleJoinGame = () => {
        if (!name.trim()) {
            showAlert('Name Required', 'Please enter your name.');
            return;
        }
        setIsJoining(true);
    };

    const submitJoin = async () => {
        if (!name.trim()) {
            showAlert('Name Required', 'Please enter your name.');
            return;
        }

        if (roomCode.length !== 4) {
            showAlert('Invalid Code', 'Please enter a 4-letter room code.');
            return;
        }

        setLoading(true);
        const { room, player, error } = await GameAPI.joinRoom(name.trim(), roomCode);

        if (error) {
            showAlert('Error', error);
            setLoading(false);
            return;
        }

        if (room && player) {
            useOnlineGameStore.getState().setRoomInfo(room.code, false, player.id, player);
            router.push('/multiplayer/lobby');
        }
        setLoading(false);
    };

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#000000', '#0A0A0A', '#000000']}
                style={styles.gradient}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={{ flex: 1 }}
                >
                    <TouchableWithoutFeedback onPress={Platform.OS === 'web' ? undefined : Keyboard.dismiss}>
                        <View style={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

                            {/* Header */}
                            <View style={styles.header}>
                                <Button
                                    title=""
                                    onPress={() => isJoining ? setIsJoining(false) : handleBack()}
                                    variant="ghost"
                                    size="small"
                                    icon={<Ionicons name="arrow-back" size={24} color={Colors.parchment} />}
                                    style={styles.backButton}
                                />
                                <Text style={styles.headerTitle}>Online Multiplayer</Text>
                                <View style={{ width: 44 }} />
                            </View>

                            <View style={styles.mainContent}>
                                {!isJoining && (
                                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={[styles.heroSection, isFocused && styles.heroSectionFocused]}>
                                        <View style={[styles.iconContainer, isFocused && styles.iconContainerFocused]}>
                                            <Ionicons name="globe-outline" size={isFocused ? 60 : 60} color={Colors.candlelight} />
                                        </View>
                                        <Text style={[styles.title, isFocused && styles.titleFocused]}>Play Remote</Text>
                                        {<Text style={styles.subtitle}>Connect with friends across devices</Text>}
                                    </Animated.View>
                                )}

                                <View style={styles.actions}>
                                    <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.inputContainer}>
                                        <Text style={styles.inputLabel}>Your Name</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="ENTER YOUR NAME"
                                            placeholderTextColor={Colors.grayMedium}
                                            onChangeText={setName}
                                            value={name}
                                            returnKeyType="done"
                                            onFocus={() => setIsFocused(true)}
                                            onBlur={() => setIsFocused(false)}
                                        />
                                    </Animated.View>

                                    {!isJoining && (
                                        <>
                                            <Animated.View entering={FadeInDown.delay(200).duration(500)}>
                                                <Button
                                                    title="Host Game"
                                                    onPress={handleHostGame}
                                                    variant="primary"
                                                    size="large"
                                                    disabled={!name.trim()}
                                                    loading={loading}
                                                    icon={<Ionicons name="add-circle-outline" size={24} color={Colors.victorianBlack} />}
                                                    style={styles.actionButton}
                                                />
                                            </Animated.View>

                                            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
                                                <Button
                                                    title="Join Game"
                                                    onPress={handleJoinGame}
                                                    variant="outline"
                                                    size="large"
                                                    disabled={!name.trim()}
                                                    icon={<Ionicons name="enter-outline" size={24} color={Colors.parchment} />}
                                                    style={styles.actionButton}
                                                />
                                            </Animated.View>
                                        </>
                                    )}

                                    {isJoining && (
                                        <Animated.View entering={FadeInDown} style={styles.joinContainer}>
                                            <Text style={styles.inputLabel}>Enter Room Code</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="ABCD"
                                                placeholderTextColor={Colors.grayMedium}
                                                maxLength={4}
                                                autoCapitalize="characters"
                                                onChangeText={(text) => setRoomCode(text.toUpperCase())}
                                                value={roomCode}
                                            />
                                            <Button
                                                title={loading ? "Joining..." : "Join Room"}
                                                onPress={submitJoin}
                                                variant="primary"
                                                size="large"
                                                disabled={loading}
                                                style={{ width: '100%', marginTop: 20 }}
                                            />
                                            <Button
                                                title="Cancel"
                                                onPress={() => setIsJoining(false)}
                                                variant="ghost"
                                                size="small"
                                                style={{ marginTop: 10 }}
                                            />
                                        </Animated.View>
                                    )}
                                </View>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </KeyboardAvoidingView>
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
    gradient: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 0,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.parchment,
        letterSpacing: 1,
    },
    mainContent: {
        flex: 1,
        justifyContent: 'center',
        paddingBottom: 40,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    heroSectionFocused: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(196, 167, 108, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(196, 167, 108, 0.3)',
    },
    iconContainerFocused: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(196, 167, 108, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(196, 167, 108, 0.3)',
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.parchment,
        marginBottom: 10,
        letterSpacing: 1,
    },
    titleFocused: {
        fontSize: 32,
        fontWeight: '800',
        color: Colors.parchment,
        marginBottom: 10,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.grayLight,
        textAlign: 'center',
        maxWidth: '80%',
    },
    actions: {
        gap: 16,
    },
    actionButton: {
        width: '100%',
    },
    joinContainer: {
        width: '100%',
        alignItems: 'center',
    },
    inputLabel: {
        color: Colors.grayLight,
        fontSize: 14,
        letterSpacing: 1,
        marginBottom: 12,
        fontWeight: '600',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    input: {
        width: '100%',
        height: 60,
        backgroundColor: Colors.grayDark,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        color: Colors.parchment,
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        paddingHorizontal: 20,
        letterSpacing: 4,
    },
});
