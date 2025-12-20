import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, TextInput } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface PlayerCardProps {
    name: string;
    index: number;
    onDelete: () => void;
    onRename: (newName: string) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ name, index, onDelete, onRename }) => {
    const translateX = useSharedValue(0);
    const itemHeight = useSharedValue(56);
    const opacity = useSharedValue(1);
    const marginBottom = useSharedValue(10);

    const doDelete = () => {
        haptics.medium();
        onDelete();
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
            if (e.translationX < 0) {
                translateX.value = Math.max(e.translationX, -SCREEN_WIDTH * 0.4);
            }
        })
        .onEnd((e) => {
            if (e.translationX < -DELETE_THRESHOLD) {
                translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
                itemHeight.value = withTiming(0, { duration: 200 });
                marginBottom.value = withTiming(0, { duration: 200 });
                opacity.value = withTiming(0, { duration: 200 }, () => {
                    runOnJS(doDelete)();
                });
            } else {
                translateX.value = withSpring(0, { damping: 15 });
            }
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
    }));

    const containerStyle = useAnimatedStyle(() => ({
        height: itemHeight.value,
        marginBottom: marginBottom.value,
        opacity: opacity.value,
    }));

    const deleteStyle = useAnimatedStyle(() => {
        const show = translateX.value < -30;
        return { opacity: show ? 1 : 0 };
    });

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <Animated.View style={[styles.deleteBtn, deleteStyle]}>
                <Ionicons name="trash" size={18} color={Colors.parchmentLight} />
            </Animated.View>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.card, cardStyle]}>
                    <Text style={styles.index}>{index + 1}</Text>
                    <TextInput
                        style={styles.nameInput}
                        value={name}
                        onChangeText={onRename}
                        maxLength={16}
                        returnKeyType="done"
                        placeholderTextColor={Colors.grayMedium}
                    />
                    <Ionicons name="pencil" size={12} color={Colors.candlelight} />
                </Animated.View>
            </GestureDetector>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: { position: 'relative', overflow: 'hidden' },
    deleteBtn: {
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 80, backgroundColor: Colors.suspect, borderRadius: 12,
        alignItems: 'center', justifyContent: 'center',
    },
    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.grayDark, borderRadius: 12, height: 56,
        paddingHorizontal: 18, gap: 14,
        borderWidth: 1.5, borderColor: Colors.grayMedium,
    },
    index: { fontSize: 14, fontWeight: '700', color: Colors.candlelight, width: 22 },
    nameInput: { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.parchment, paddingVertical: 8, letterSpacing: 0.5 },
});
