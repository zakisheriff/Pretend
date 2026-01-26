import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ChatModal = ({ visible, onClose }: ChatModalProps) => {
    const insets = useSafeAreaInsets();
    const { messages, sendChatMessage, myPlayerId, setChatOpen, clearUnreadCount } = useOnlineGameStore();
    const [inputText, setInputText] = React.useState('');
    const flatListRef = useRef<FlatList>(null);

    React.useEffect(() => {
        setChatOpen(visible);
        if (visible) clearUnreadCount();
    }, [visible]);

    const handleSend = () => {
        if (!inputText.trim()) return;
        sendChatMessage(inputText.trim());
        setInputText('');
    };

    useEffect(() => {
        if (visible && messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [visible, messages]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: Platform.OS === 'android' ? insets.top + 20 : 20 }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Discussion</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close-circle" size={32} color={Colors.grayLight} />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    renderItem={({ item }) => {
                        const isMe = item.senderId === myPlayerId;
                        return (
                            <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
                                <Text style={[styles.senderName, isMe && { marginRight: 4, alignSelf: 'flex-end', color: Colors.gaslightAmber }]}>
                                    {item.senderName} {isMe ? '(You)' : ''}
                                </Text>
                                <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                                    <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
                                        {item.content}
                                    </Text>
                                </View>
                            </View>
                        );
                    }}
                />

                {/* Input */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            placeholderTextColor={Colors.grayLight}
                            value={inputText}
                            onChangeText={setInputText}
                            returnKeyType="send"
                            onSubmitEditing={handleSend}
                        />
                        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} disabled={!inputText.trim()}>
                            <Ionicons
                                name="send"
                                size={24}
                                color={inputText.trim() ? Colors.victorianBlack : Colors.grayLight}
                                style={{ marginLeft: 4 }}
                            />
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: Colors.parchment,
        letterSpacing: 1,
    },
    closeBtn: {
        padding: 4,
    },
    listContent: {
        padding: 20,
        gap: 12,
    },
    messageRow: {
        maxWidth: '80%',
        marginBottom: 8,
    },
    myRow: {
        alignSelf: 'flex-end',
        alignItems: 'flex-end',
    },
    otherRow: {
        alignSelf: 'flex-start',
        alignItems: 'flex-start',
    },
    senderName: {
        fontSize: 10,
        color: Colors.grayLight,
        marginBottom: 4,
        marginLeft: 4,
    },
    bubble: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    myBubble: {
        backgroundColor: '#2A2A2A',
        borderWidth: 1,
        borderColor: '#444',
        borderBottomRightRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
        elevation: 3,
    },
    otherBubble: {
        backgroundColor: '#1E1E1E',
        borderWidth: 1,
        borderColor: '#333',
        borderBottomLeftRadius: 4,
    },
    msgText: {
        fontSize: 16,
    },
    myMsgText: {
        color: Colors.parchment,
    },
    otherMsgText: {
        color: '#FFF',
    },
    inputArea: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1A1A1A',
        gap: 12,
    },
    input: {
        flex: 1,
        height: 48,
        backgroundColor: '#333',
        borderRadius: 24,
        paddingHorizontal: 20,
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#444',
    },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.parchment,
    },
});
