import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatModal } from './ChatModal';

export const FloatingChat = () => {
    const pathname = usePathname();
    const insets = useSafeAreaInsets();
    const { roomCode, isHost, unreadMessageCount } = useOnlineGameStore();
    const [visible, setVisible] = React.useState(false);

    // Only show in multiplayer screens, when in a room, and for the host as requested
    // although arguably all players might want it, we follow the specific request.
    // Actually, if we are in 'game' screen, it might already have a button.
    // To avoid duplicates, we can check the pathname.

    if (!roomCode) return null;

    // Always show if we are in any multiplayer sub-route
    if (!pathname.startsWith('/multiplayer')) return null;

    return (
        <View style={[styles.wrapper, { top: insets.top + 70 }]}>
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
            <ChatModal visible={visible} onClose={() => setVisible(false)} />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        right: 20,
        zIndex: 9999,
    },
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
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
