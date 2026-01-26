import { ChatModal } from '@/components/game/ChatModal';
import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, PanResponder, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const FloatingChat = () => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { width: windowWidth, height: windowHeight } = useWindowDimensions();
    const { roomCode, unreadMessageCount } = useOnlineGameStore();
    const [visible, setVisible] = React.useState(false);

    // Draggable position
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gesture) => {
                return Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3;
            },
            onPanResponderGrant: () => {
                pan.extractOffset();
            },
            onPanResponderMove: (e, gestureState) => {
                // Determine boundaries relative to Initial position (right: 20, top: insets.top + 70)
                // button is 50x50
                // Right: 20 -> x offset can go from -windowWidth + 70 to 20? 
                // No, x: 0 is right: 20. 
                // To move left, dx is negative. Max negative = -windowWidth + 50 + 40 (padding)
                // To move right, dx is positive. Max positive = 20 (since we started 20 from right)
                // But let's keep it simple and just allow the move, pan.setValue handles it.

                pan.setValue({ x: gestureState.dx, y: gestureState.dy });
            },
            onPanResponderRelease: () => {
                pan.flattenOffset();

                // Optional: Snap to edges or stay put.
                // For now, staying put as requested ("wherever movable").
            }
        })
    ).current;

    if (!roomCode) return null;
    if (!pathname.startsWith('/multiplayer')) return null;

    return (
        <View
            style={styles.root}
            pointerEvents="box-none"
        >
            <Animated.View
                {...panResponder.panHandlers}
                style={[
                    styles.wrapper,
                    { bottom: Math.max(insets.bottom + 20, 40) },
                    { transform: pan.getTranslateTransform() },
                ]}
            >
                <TouchableOpacity
                    style={styles.button}
                    onPress={() => setVisible(true)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="chatbubbles" size={24} color={Colors.parchment} />
                    {unreadMessageCount > 0 && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>{unreadMessageCount}</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
            <ChatModal visible={visible} onClose={() => setVisible(false)} />
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
        // Using full screen area so we can drag anywhere
        paddingTop: 0, // Adjusted via inline style
    },
    wrapper: {
        position: 'absolute',
        right: 20,
    },
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
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
