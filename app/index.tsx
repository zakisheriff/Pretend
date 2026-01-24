import { AnimatedLogo, Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BrandSplash = ({ onFinish, onSkip, isSkipping }: { onFinish: () => void; onSkip: () => void; isSkipping: boolean }) => {
    const opacity = useSharedValue(1);

    const handleFinish = () => {
        // Run on JS thread to safely trigger state update
        onFinish();
    };

    const triggerExit = () => {
        // Use constant duration to prevent re-render/remount glitches on web when skipping
        const exitDuration = 800;
        opacity.value = withTiming(0, { duration: exitDuration }, (finished) => {
            if (finished) {
                runOnJS(handleFinish)();
            }
        });
    };

    React.useEffect(() => {
        if (isSkipping) {
            triggerExit();
        }
    }, [isSkipping]);

    React.useEffect(() => {
        const timer = setTimeout(() => {
            if (!isSkipping) triggerExit();
        }, 4500); // Reduced from 7500 for faster load
        return () => clearTimeout(timer);
    }, []);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacity.value
    }));

    return (
        <Animated.View
            key="brand-splash"
            style={[styles.splashContainer, StyleSheet.absoluteFill, animatedStyle, { zIndex: 100, backgroundColor: 'black' }]}
        >
            <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center', width: '100%' }} onPress={onSkip}>
                <View style={styles.splashContent}>
                    <View style={styles.brandTextContainer}>
                        <Animated.Text
                            entering={FadeIn.duration(2000)} // Faster fade in
                            style={styles.brandMain}
                        >
                            The One Atom
                        </Animated.Text>

                        <Animated.Text
                            entering={FadeIn.delay(2200).duration(1000)} // Earlier tagline
                            style={styles.brandSub}
                        >
                            Atom Originals
                        </Animated.Text>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
};

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const resetToHome = useGameStore((state) => state.resetToHome);
    const hasShownSplash = useGameStore((state) => state.hasShownSplash);
    const setHasShownSplash = useGameStore((state) => state.setHasShownSplash);
    const [isSkipping, setIsSkipping] = React.useState(false);

    // If splash hasn't been shown, we are splashing.
    // If it HAS been shown, we are NOT splashing.
    const isSplashing = !hasShownSplash;

    const handleSkip = () => {
        setIsSkipping(true);
        // We'll set the global state when the exit animation completes in the Splash component
        // But for immediate feedback if needed, logic is handled in the effect
    };

    const handleNewGame = () => {
        resetToHome();
        router.push('/select-mode');
    };
    const handleHowToPlay = () => {
        router.push('/how-to-play');
    };

    const exitDuration = isSkipping ? 500 : 1500;
    // CRITICAL FIX: If we are NOT splashing (splash already shown), there should be NO delay.
    // The delay was causing the black screen issue when returning home.
    const entryDelay = isSplashing ? (exitDuration - 200) : 0;

    return (
        <View style={{ flex: 1, backgroundColor: 'black' }}>
            {!isSplashing && (
                <Animated.View
                    key="home-content"
                    entering={FadeIn.delay(entryDelay).duration(1500)}
                    style={{ flex: 1 }}
                >
                    <LinearGradient
                        colors={['#000000', '#0A0A0A', '#000000']}
                        style={styles.gradient}
                    >
                        <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
                            {/* Settings Button */}
                            <Animated.View
                                entering={FadeIn.delay(800).duration(600)}
                                style={[styles.settingsButton, { top: insets.top + 10 }]}
                            >
                                <Pressable
                                    onPress={() => {
                                        haptics.medium();
                                        router.push('/settings');
                                    }}
                                    hitSlop={20}
                                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                                >
                                    <Ionicons name="settings-outline" size={24} color={Colors.grayLight} />
                                </Pressable>
                            </Animated.View>

                            {/* Hero Section */}
                            <View style={styles.hero}>
                                {/* <Animated.View entering={FadeIn.delay(100).duration(600)}>
                                    <AnimatedLogo size={90} />
                                </Animated.View> */}

                                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.titleGroup}>
                                    <Text style={styles.title}>Pretend</Text>
                                    <Text style={styles.subtitle}>A Mystery Party</Text>
                                </Animated.View>

                                <Animated.View entering={FadeIn.delay(400).duration(500)}>
                                    <Text style={styles.tagline}>One phone. One mystery.</Text>
                                </Animated.View>
                            </View>

                            {/* Actions */}
                            <View style={styles.actions}>
                                <Animated.View entering={FadeInDown.delay(500).duration(400)}>
                                    <Button
                                        title="New Case"
                                        onPress={handleNewGame}
                                        variant="primary"
                                        size="large"
                                        hapticType="medium"
                                        icon={<Ionicons name="search" size={20} color={Colors.victorianBlack} />}
                                    />
                                </Animated.View>

                                <Animated.View entering={FadeInDown.delay(600).duration(400)}>
                                    <Button
                                        title="How to Play"
                                        onPress={handleHowToPlay}
                                        variant="outline"
                                        size="large"
                                        icon={<Ionicons name="book-outline" size={20} color={Colors.parchment} />}
                                    />
                                </Animated.View>

                                {Platform.OS === 'web' && (
                                    <Animated.View entering={FadeInDown.delay(700).duration(400)}>
                                        <Button
                                            title="Download Coming Soon"
                                            onPress={() => { }}
                                            variant="secondary"
                                            size="large"
                                            disabled
                                            icon={<Ionicons name="logo-android" size={20} color={Colors.parchment} />}
                                        />
                                    </Animated.View>
                                )}
                            </View>

                        </View>
                    </LinearGradient>
                </Animated.View>
            )}

            {isSplashing && (
                <BrandSplash
                    onFinish={() => setHasShownSplash(true)}
                    onSkip={handleSkip}
                    isSkipping={isSkipping}
                />
            )}
        </View>
    );

    /* Original render logic removed/replaced */
}

const styles = StyleSheet.create({
    gradient: { flex: 1 },
    container: {
        flex: 1,
        paddingHorizontal: 24,
    },
    hero: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
    },
    titleGroup: {
        alignItems: 'center',
        gap: 4,
    },
    title: {
        fontSize: 38,
        fontWeight: '800',
        color: Colors.parchment,
        letterSpacing: 6,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.candlelight,
        letterSpacing: 3,
    },
    tagline: {
        fontSize: 13,
        color: Colors.grayLight,
        fontStyle: 'italic',
        letterSpacing: 1,
        marginTop: 8,
    },
    actions: {
        gap: 12,
        paddingBottom: 16,
    },
    footer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    footerText: {
        fontSize: 11,
        color: Colors.grayMedium,
        letterSpacing: 1,
    },
    // Brand Splash Styles
    /* splashWrapper removed */
    splashContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splashContent: {
        alignItems: 'center',
    },
    brandTextContainer: {
        alignItems: 'center',
        gap: 12,
    },
    brandMain: {
        fontSize: 34,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1.8,
        lineHeight: 38,
    },
    brandSub: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.grayLight,
        // opacity: 0.7, // Removed opacity to fix web visibility
    },
    brandLine: {
        width: 20,
        height: 1,
        backgroundColor: Colors.candlelight,
        // opacity: 0.3, // Removed opacity to fix web visibility
    },
    settingsButton: {
        position: 'absolute',
        // top set dynamically
        right: 24, // Matches container horizontal padding
        zIndex: 10,
    },
});
