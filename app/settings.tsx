
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Linking,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Share,
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

    const handleShare = async () => {
        try {
            await Share.share({
                message: 'Check out "Pretend - A Mystery Party Game"! Download it now.',
                url: 'https://pretend.theoneatom.com',
            });
        } catch (error) {
            // Ignore share errors
        }
    };

    const handleSupport = () => {
        Linking.openURL('https://buymeacoffee.com/theoneatom').catch(() => {
            Alert.alert('Error', 'Could not open link');
        });
    };

    const handleWebsite = () => {
        Linking.openURL('https://theoneatom.com').catch(() => { });
    };

    const handleFeedback = () => {
        Linking.openURL('mailto:support@theoneatom.com').catch(() => {
            Alert.alert('Error', 'Could not open email client');
        });
    };

    const handlePrivacy = () => {
        Linking.openURL('https://theoneatom.com/privacy').catch(() => { });
    };

    const handleTerms = () => {
        Linking.openURL('https://theoneatom.com/terms').catch(() => { });
    };

    const handleRate = () => {
        // Placeholder for store link
        const url = Platform.OS === 'ios'
            ? 'https://apps.apple.com/app/id123456789'
            : 'https://play.google.com/store/apps/details?id=com.oneatom.pretend';

        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open store link');
        });
    };

    const SettingItem = ({ icon, label, onPress, showChevron = true, value }: { icon: string, label: string, onPress?: () => void, showChevron?: boolean, value?: React.ReactNode }) => (
        <Pressable
            style={({ pressed }) => [styles.settingRow, pressed && onPress && { opacity: 0.7 }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.settingInfo}>
                <View style={styles.iconContainer}>
                    <Ionicons name={icon as any} size={22} color={Colors.candlelight} />
                </View>
                <Text style={styles.settingLabel}>{label}</Text>
            </View>
            {value}
            {showChevron && !value && (
                <Ionicons name="chevron-forward" size={20} color={Colors.grayLight} />
            )}
        </Pressable>
    );

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

                        <SettingItem
                            icon="volume-high-outline"
                            label="Sound Effects"
                            showChevron={false}
                            value={
                                <Switch
                                    trackColor={{ false: Colors.grayMedium, true: Colors.gray }}
                                    thumbColor={Colors.parchment}
                                    ios_backgroundColor={Colors.grayMedium}
                                    onValueChange={toggleSound}
                                    value={settings.soundEnabled}
                                    {...({ activeTrackColor: Colors.gray, activeThumbColor: Colors.parchment } as any)}
                                />
                            }
                        />

                        <SettingItem
                            icon="phone-portrait-outline"
                            label="Haptics"
                            showChevron={false}
                            value={
                                <Switch
                                    trackColor={{ false: Colors.grayMedium, true: Colors.gray }}
                                    thumbColor={Colors.parchment}
                                    ios_backgroundColor={Colors.grayMedium}
                                    onValueChange={toggleHaptics}
                                    value={settings.hapticsEnabled}
                                    {...({ activeTrackColor: Colors.gray, activeThumbColor: Colors.parchment } as any)}
                                />
                            }
                        />
                    </View>

                    {/* General Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>General</Text>
                        <SettingItem
                            icon="book-outline"
                            label="How to Play"
                            onPress={() => router.push('/how-to-play')}
                        />
                    </View>

                    {/* Support Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Support</Text>
                        <SettingItem
                            icon="share-social-outline"
                            label="Share App"
                            onPress={handleShare}
                        />
                        <SettingItem
                            icon="star-outline"
                            label="Rate Us"
                            onPress={handleRate}
                        />
                        <SettingItem
                            icon="cafe-outline"
                            label="Buy Me a Coffee"
                            onPress={handleSupport}
                        />
                    </View>

                    {/* Legal Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Legal</Text>
                        <SettingItem
                            icon="shield-checkmark-outline"
                            label="Privacy Policy"
                            onPress={handlePrivacy}
                        />
                        <SettingItem
                            icon="document-text-outline"
                            label="Terms of Service"
                            onPress={handleTerms}
                        />
                    </View>

                    {/* About Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>About</Text>
                        <Pressable
                            style={({ pressed }) => [styles.aboutCard, pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] }]}
                            onPress={handleWebsite}
                        >
                            <View style={styles.atomIcon}>
                            </View>
                            <Text style={styles.atomTitle}>The One Atom</Text>
                            <Text style={styles.visitText}>Tap to visit website</Text>
                            <Text style={styles.versionText}>Version 1.0.0</Text>
                        </Pressable>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Thank you for playing!</Text>
                    </View>

                </ScrollView>
            </SafeAreaView>
        </View >
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
    visitText: {
        fontSize: 12,
        color: Colors.grayLight,
        marginBottom: 8,
        fontWeight: '600',
    },
    versionText: {
        fontSize: 14,
        color: Colors.grayLight,
        marginBottom: 24
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
