import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Dimensions, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
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
    drag?: () => void;
    isActive?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ name, index, onDelete, onRename, drag, isActive }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);

    const translateX = useSharedValue(0);
    const itemHeight = useSharedValue(56);
    const opacity = useSharedValue(1);
    const marginBottom = useSharedValue(10);

    // Scale effect when active (dragging)
    const scale = useSharedValue(1);

    React.useEffect(() => {
        scale.value = withSpring(isActive ? 1.05 : 1);
    }, [isActive]);

    const doDelete = () => {
        haptics.medium();
        onDelete();
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .enabled(!isEditing) // Disable swipe when editing
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
        transform: [
            { translateX: translateX.value },
            { scale: scale.value }
        ],
        zIndex: isActive ? 1000 : 1,
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

    const handleStartEdit = () => {
        setEditName(name);
        setIsEditing(true);
    };

    const handleEndEdit = () => {
        setIsEditing(false);
        if (editName.trim() && editName.trim() !== name) {
            onRename(editName.trim());
        } else {
            setEditName(name);
        }
    };

    return (
        <Animated.View style={[styles.container, containerStyle]}>
            <Animated.View style={[styles.deleteBtn, deleteStyle]}>
                <Ionicons name="trash" size={18} color={Colors.parchmentLight} />
            </Animated.View>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.card, cardStyle, isActive && styles.cardActive]}>
                    <Text style={styles.index}>{index + 1}</Text>

                    {isEditing ? (
                        <TextInput
                            style={styles.nameInput}
                            value={editName}
                            onChangeText={setEditName}
                            maxLength={16}
                            autoFocus
                            onBlur={handleEndEdit}
                            onSubmitEditing={handleEndEdit}
                            returnKeyType="done"
                        />
                    ) : (
                        <TouchableOpacity
                            style={styles.nameContainer}
                            onPress={handleStartEdit}
                            activeOpacity={0.7}
                            onLongPress={drag}
                            delayLongPress={200}
                        >
                            <Text style={styles.nameText}>{name}</Text>
                            <Ionicons name="pencil" size={12} color={Colors.candlelight} />
                        </TouchableOpacity>
                    )}

                    {!isEditing && (
                        <TouchableOpacity
                            onPressIn={drag}
                            style={styles.dragHandle}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="menu" size={20} color={Colors.gray} />
                        </TouchableOpacity>
                    )}
                </Animated.View>
            </GestureDetector>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: { position: 'relative', overflow: 'visible' },
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
    cardActive: {
        borderColor: Colors.candlelight,
        backgroundColor: Colors.grayMedium,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4.65,
        elevation: 8,
    },
    index: { fontSize: 14, fontWeight: '700', color: Colors.candlelight, width: 22 },
    nameContainer: {
        flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 8,
    },
    nameText: { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.parchment, letterSpacing: 0.5 },
    nameInput: { flex: 1, fontSize: 16, fontWeight: '500', color: Colors.parchment, paddingVertical: 8, letterSpacing: 0.5 },
    dragHandle: { padding: 4 },
});
