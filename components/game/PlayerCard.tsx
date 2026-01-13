import { Colors } from '@/constants/colors';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

type PlayerCardProps = {
    id: string;
    name: string;
    index: number;
    onDelete: (id: string) => void;
    onRename: (id: string, newName: string) => void;
    onRequestDeleteSignal: (id: string) => void;
    drag?: () => void;
    isActive?: boolean;
    onFocus?: () => void;
    isEditing?: boolean;
    onEditStart?: () => void;
    onEditEnd?: () => void;
};

const PlayerCardBase = (props: PlayerCardProps) => {
    const {
        id, name, index, onDelete, onRename, onRequestDeleteSignal, drag, isActive, onFocus,
        isEditing, onEditStart, onEditEnd
    } = props;

    // Animation Values
    const translateX = useSharedValue(0);
    const itemHeight = useSharedValue(56);
    const opacity = useSharedValue(1);
    const marginBottom = useSharedValue(10);
    const scale = useSharedValue(1);
    const isEditingSV = useSharedValue(false);

    // Editing State
    const [editName, setEditName] = useState(name);
    const editNameRef = useRef(name);
    const prevEditing = useRef(isEditing);
    const inputRef = useRef<TextInput>(null);

    // Sync isActive scale
    useEffect(() => {
        scale.value = withSpring(isActive ? 1.03 : 1, { damping: 20, stiffness: 200 });
    }, [isActive]);

    // Sync isEditing SharedValue
    useEffect(() => {
        isEditingSV.value = !!isEditing;
    }, [isEditing]);

    // Sync local name with prop
    useEffect(() => {
        setEditName(name);
        editNameRef.current = name;
    }, [name]);

    // Save on external toggle (isEditing becomes false)
    useEffect(() => {
        if (prevEditing.current && !isEditing) {
            const val = editNameRef.current.trim();
            if (val && val !== name) {
                onRename(id, val);
            } else {
                setEditName(name);
            }
        }
        prevEditing.current = isEditing;
    }, [isEditing, name, id, onRename]);

    const confirmDelete = () => {
        haptics.light();
        onRequestDeleteSignal(id);
    };

    const doDelete = () => {
        haptics.medium();
        onDelete(id);
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((e) => {
            if (isEditingSV.value) return;
            if (e.translationX < 0) {
                translateX.value = Math.max(e.translationX, -SCREEN_WIDTH * 0.4);
            }
        })
        .onEnd((e) => {
            if (isEditingSV.value) return;
            if (e.translationX < -DELETE_THRESHOLD) {
                translateX.value = withTiming(-SCREEN_WIDTH, { duration: 200 });
                itemHeight.value = withTiming(0, { duration: 200 });
                marginBottom.value = withTiming(0, { duration: 200 });
                opacity.value = withTiming(0, { duration: 200 }, () => {
                    runOnJS(doDelete)();
                });
            } else {
                translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
            }
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }, { scale: scale.value }],
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
        if (props.onEditStart) props.onEditStart();
        if (onFocus) onFocus();
    };

    const handleEndEdit = () => {
        // Blur and dismiss keyboard explicitly
        inputRef.current?.blur();
        Keyboard.dismiss();

        const val = editName.trim();
        if (val && val !== name) onRename(id, val);
        else setEditName(name);

        if (props.onEditEnd) props.onEditEnd();
    };

    // Update ref on text change
    const handleChangeText = (text: string) => {
        setEditName(text);
        editNameRef.current = text;
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
                            ref={inputRef}
                            style={styles.nameInput}
                            value={editName}
                            onChangeText={handleChangeText}
                            maxLength={16}
                            autoFocus
                            blurOnSubmit={true}
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
                        <View style={styles.actions}>
                            <TouchableOpacity
                                onPress={confirmDelete}
                                style={styles.actionBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="trash-outline" size={20} color={Colors.suspect} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPressIn={drag}
                                style={styles.actionBtn}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <Ionicons name="menu" size={20} color={Colors.grayLight} />
                            </TouchableOpacity>
                        </View>
                    )}
                </Animated.View>
            </GestureDetector>
        </Animated.View>
    );
};

export const PlayerCard = PlayerCardBase;

const styles = StyleSheet.create({
    container: { position: 'relative', overflow: 'visible' },
    deleteBtn: {
        position: 'absolute', right: 0, top: 0, bottom: 0,
        width: 80, backgroundColor: Colors.suspect, borderRadius: 25,
        alignItems: 'center', justifyContent: 'center',
    },
    card: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: Colors.grayDark, borderRadius: 25, height: 56,
        paddingHorizontal: 18, gap: 14,
        borderWidth: 1, borderColor: Colors.grayMedium,
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
    actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    actionBtn: { padding: 8 },
});
