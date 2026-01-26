import { ChatModal } from '@/components/game/ChatModal';
import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BUTTON_SIZE = 50;
const MARGIN = 20;

export const FloatingChat = () => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const { roomCode, unreadMessageCount } = useOnlineGameStore();
    const [modalVisible, setModalVisible] = useState(false);

    // Initial position: Bottom Right
    // X = Window Width - Button Size - Margin
    // Y = Window Height - Button Size - Bottom Inset - Margin (or some fixed offset)
    const initialX = windowWidth - BUTTON_SIZE - MARGIN;
    const initialY = windowHeight - BUTTON_SIZE - Math.max(insets.bottom + 20, 40);

    const pan = useRef(new Animated.ValueXY({ x: initialX, y: initialY })).current;

    // We need to track the current value to clamp properly during the gesture
    const panValue = useRef({ x: initialX, y: initialY });

    useEffect(() => {
        const id = pan.addListener((value) => {
            panValue.current = value;
        });
        return () => pan.removeListener(id);
    }, [pan]);

    // Update position if dimensions change (e.g. rotation), keeping relative constraint if possible
    // For simplicity, we just clamp existing position to new bounds
    useEffect(() => {
        const currentX = panValue.current.x;
        const currentY = panValue.current.y;

        const maxX = windowWidth - BUTTON_SIZE;
        const maxY = windowHeight - BUTTON_SIZE - insets.bottom;
        const minX = 0;
        const minY = insets.top;

        let newX = currentX;
        let newY = currentY;

        if (newX > maxX) newX = maxX;
        if (newX < minX) newX = minX;
        if (newY > maxY) newY = maxY;
        if (newY < minY) newY = minY;

        if (newX !== currentX || newY !== currentY) {
            pan.setValue({ x: newX, y: newY });
        }
    }, [windowWidth, windowHeight, insets, pan]);


    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => {
                return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
            },
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: panValue.current.x,
                    y: panValue.current.y
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: (e, gestureState) => {
                // Calculate predicted absolute position
                const currentOffsetX = panValue.current.x; // Value before gesture started (stored in offset)
                // Actually, due to setOffset, panValue.current might be updating.
                // Let's use simpler logic: pan.x = offset + value. 
                // offset was set to start position. value is gesture.dx.

                // We want to CLAMP the result.
                // Absolute X = startX + gesture.dx
                // Since we used setOffset(startX), pan.x is effectively (startX + gesture.dx).

                // However, Animated.event or plain setValue doesn't clamp. 
                // We must manually calculate.

                // Accessing the offset directly from the animated value is tricky in synchronous code 
                // without keeping track of it manually if we used setOffset.
                // Let's rely on the fact that we set offset.

                // Better approach for strict clamping without native driver purely:
                // Don't use setOffset. Just manual math.

                // Let's reset the flow in onPanResponderGrant to be simpler for clamping.
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    // Redefining PanResponder to be clamp-friendly
    const panResponderRef = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
            onPanResponderGrant: () => {
                // We do NOT use setOffset here to keep "pan" as the absolute position
                // Instead, we record where we started
                pan.extractOffset(); // effectively sets offset = value, value = 0
            },
            onPanResponderMove: (e, gestureState) => {
                // pan.x represents the cumulative position (offset + value)
                // But we want to clamp it. 
                // Animated.Value doesn't support clamping natively during setValue unless we use interpolation,
                // but we want to STOP dragging if it hits the edge? Or just clamp the visual?
                // Clamping the visual is easiest.

                // Current Absolute Position = Offset + gesture.dx
                // We can't easily get "Offset" from the animated value synchronously here without tracking it.
                // BUT, we know that extractOffset() moved the total value into the offset.
                // So the *change* we want to apply is gestureState.dx

                // Wait, if we use extractOffset, pan.x is 0. 
                // The rendered output is offset + pan.x.
                // We can't clamp 'offset'. We can only clamp 'pan.x'.
                // If offset is 300, and we move right 100, x becomes 100. Total 400.
                // If limit is 350, we want total 350. So x must be 50.

                // We need to know the offset.
                // 'pan' object has private fields but let's be safe.
                // Let's track the start position manually.
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    // Third time's the charm: Reliable Manual Clamping
    // We will store the absolute position in a ref 'currentPos'.
    // We will update 'pan' to exactly that position.
    // We won't use offsets or extractOffset for the animation value itself during the gesture, 
    // or we will use them carefully.

    // Simplest: No offsets. Just setValue to absolute coordinates.
    const currentPos = useRef({ x: initialX, y: initialY });
    const dragStartPos = useRef({ x: 0, y: 0 });

    const clampedPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
            onPanResponderGrant: () => {
                dragStartPos.current = { x: currentPos.current.x, y: currentPos.current.y };
            },
            onPanResponderMove: (e, gestureState) => {
                let newX = dragStartPos.current.x + gestureState.dx;
                let newY = dragStartPos.current.y + gestureState.dy;

                // Clamp
                const maxX = windowWidth - BUTTON_SIZE; // Right edge
                const maxY = windowHeight - BUTTON_SIZE - insets.bottom; // Bottom edge - inset
                const minX = 0; // Left edge
                const minY = insets.top; // Top edge + inset

                if (newX < minX) newX = minX;
                if (newX > maxX) newX = maxX;
                if (newY < minY) newY = minY;
                if (newY > maxY) newY = maxY;

                pan.setValue({ x: newX, y: newY });
                currentPos.current = { x: newX, y: newY };
            },
            onPanResponderRelease: () => {
                // No cleanup needed since we are driving absolute values directly
            }
        })
    ).current;

    // We need to sync the Animated Value if the initial position / orientation changes
    // But we only want to do it if we are NOT dragging.
    // The useEffect above handles re-clamping on dimension change.
    // We also need to make sure 'currentPos' is updated if the effect updates 'pan'.
    useEffect(() => {
        const id = pan.addListener((value) => {
            currentPos.current = value;
        });
        return () => pan.removeListener(id);
    }, [pan]);

    if (!roomCode) return null;
    if (!pathname.startsWith('/multiplayer')) return null;

    return (
        <View
            style={styles.root}
            pointerEvents="box-none"
        >
            <Animated.View
                {...clampedPanResponder.panHandlers}
                style={[
                    styles.buttonContainer,
                    {
                        transform: pan.getTranslateTransform(),
                        // Note: transform [ { translateX: x }, { translateY: y } ] 
                        // works if the view is at 0,0.
                        // So we must position the view at top:0, left:0.
                    }
                ]}
            >
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setModalVisible(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chatbubble" size={24} color={Colors.parchment} />
                    {unreadMessageCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadMessageCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
            <ChatModal visible={modalVisible} onClose={() => setModalVisible(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    root: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
    },
    buttonContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        // Remove 'right' and 'bottom' so transform works from 0,0 origin
    },
    button: {
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        borderRadius: BUTTON_SIZE / 2,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 8,
    },
    badge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#FF4444',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'black',
    },
    badgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
