import { AnimatedLogo, Button } from '@/components/game';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BrandSplash = ({ onFinish }: { onFinish: () => void }) => {
    React.useEffect(() => {
        const timer = setTimeout(onFinish, 3000); // Sequence duration
        return () => clearTimeout(timer);
    }, [onFinish]);

    return (
        <Animated.View
            key="brand-splash"
            exiting={FadeOut.duration(1000)}
            style={styles.splashContainer}
        >
            <View style={styles.splashContent}>
                <View style={styles.brandTextContainer}>
                    <Animated.Text
                        entering={FadeIn.duration(1000)}
                        style={styles.brandMain}
                    >
                        The One Atom
                    </Animated.Text>

                    <Animated.View
                        entering={FadeIn.delay(800).duration(800)}
                        style={styles.brandLine}
                    />

                    <Animated.Text
                        entering={FadeIn.delay(1200).duration(800)}
                        style={styles.brandSub}
                    >
                        Atom Originals
                    </Animated.Text>
                </View>
            </View>
        </Animated.View>
    );
};

export default function HomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const resetToHome = useGameStore((state) => state.resetToHome);
    const [isSplashing, setIsSplashing] = React.useState(true);

    const handleNewGame = () => {
        resetToHome();
        router.push('/select-mode');
    };
    const handleHowToPlay = () => {
        router.push('/how-to-play');
    };

    if (isSplashing) {
        return <BrandSplash onFinish={() => setIsSplashing(false)} />;
    }

    return (
        <Animated.View
            key="home-content"
            entering={FadeIn.duration(1200)}
            style={{ flex: 1 }}
        >
            <LinearGradient
                colors={['#000000', '#0A0A0A', '#000000']}
                style={styles.gradient}
            >
                <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
                    {/* Hero Section */}
                    <View style={styles.hero}>
                        <Animated.View entering={FadeIn.delay(100).duration(600)}>
                            <AnimatedLogo size={90} />
                        </Animated.View>

                        <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.titleGroup}>
                            <Text style={styles.title}>Pretend</Text>
                            <Text style={styles.subtitle}>A Detective Mystery</Text>
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
                    </View>

                    {/* Footer */}
                    <Animated.View entering={FadeIn.delay(800).duration(500)} style={styles.footer}>
                        <Text style={styles.footerText}>Trust No One </Text>
                    </Animated.View>
                </View>
            </LinearGradient>
        </Animated.View>
    );
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
    splashContainer: {
        flex: 1,
        backgroundColor: '#000000',
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
        fontWeight: '400',
        color: Colors.grayLight,
        letterSpacing: 2,
        fontStyle: 'italic',
        opacity: 0.7,
    },
    brandLine: {
        width: 20,
        height: 1,
        backgroundColor: Colors.candlelight,
        opacity: 0.3,
    },
});
