
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { settings, updateSettings } = useGameStore();

    const toggleSound = (value: boolean) => {
        updateSettings({ soundEnabled: value });
    };

    const toggleHaptics = (value: boolean) => {
        updateSettings({ hapticsEnabled: value });
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.backButtonPressed,
                        ]}
                    >
                        <Ionicons name="arrow-back" size={24} color={Colors.parchment} />
                    </Pressable>
                    <Text style={styles.title}>Settings</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Preferences Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Preferences</Text>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="volume-high-outline" size={22} color={Colors.candlelight} />
                                </View>
                                <Text style={styles.settingLabel}>Sound Effects</Text>
                            </View>
                            <Switch
                                trackColor={{ false: Colors.grayMedium, true: Colors.detective }}
                                thumbColor={Colors.parchment}
                                ios_backgroundColor={Colors.grayMedium}
                                onValueChange={toggleSound}
                                value={settings.soundEnabled}
                            />
                        </View>

                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="phone-portrait-outline" size={22} color={Colors.candlelight} />
                                </View>
                                <Text style={styles.settingLabel}>Haptics</Text>
                            </View>
                            <Switch
                                trackColor={{ false: Colors.grayMedium, true: Colors.detective }}
                                thumbColor={Colors.parchment}
                                ios_backgroundColor={Colors.grayMedium}
                                onValueChange={toggleHaptics}
                                value={settings.hapticsEnabled}
                            />
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>

                        <View style={styles.aboutCard}>
                            <View style={styles.atomIcon}>
                            </View>
                            <Text style={styles.atomTitle}>The One Atom</Text>
                            <Text style={styles.versionText}>Version 1.0.0</Text>
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Thank you for playing!</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: Colors.grayDark,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    backButtonPressed: {
        backgroundColor: Colors.grayMedium,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        color: Colors.parchment,
        letterSpacing: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.candlelight,
        opacity: 0.7,
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 4,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.grayDark,
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    settingLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.parchment,
    },
    aboutCard: {
        backgroundColor: Colors.grayDark,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    atomIcon: {
        marginBottom: 12,
        opacity: 0.9,
    },
    atomTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: Colors.parchment,
        marginBottom: 4,
        letterSpacing: 0.5,
    },
    versionText: {
        fontSize: 14,
        color: Colors.grayLight,
        marginBottom: 24,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: Colors.grayMedium,
        marginBottom: 20,
    },
    creditRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 12,
    },
    creditRole: {
        fontSize: 14,
        color: Colors.grayLight,
        fontWeight: '500',
    },
    creditName: {
        fontSize: 14,
        color: Colors.candlelight,
        fontWeight: '700',
    },
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 14,
        fontStyle: 'italic',
        color: Colors.grayLight,
        opacity: 0.5,
    },
});
