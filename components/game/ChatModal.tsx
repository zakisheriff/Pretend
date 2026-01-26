import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ChatModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ChatModal = ({ visible, onClose }: ChatModalProps) => {
    const insets = useSafeAreaInsets();
    const { messages, sendChatMessage, myPlayerId, setChatOpen, clearUnreadCount, typingPlayers, setTyping } = useOnlineGameStore();
    const [inputText, setInputText] = React.useState('');
    const [replyTo, setReplyTo] = useState<{ id: string, name: string, content: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    React.useEffect(() => {
        setChatOpen(visible);
        if (visible) clearUnreadCount();
    }, [visible]);

    const handleTextChange = (text: string) => {
        setInputText(text);

        if (!typingTimeoutRef.current) {
            setTyping(true);
        } else {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleSend = async () => {
        if (!inputText.trim()) return;

        // Clear typing status immediately
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
            setTyping(false);
        }

        await sendChatMessage(inputText.trim(), replyTo || undefined);
        setInputText('');
        setReplyTo(null);
        // Explicitly scroll to bottom after sending
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Keep keyboard open and focus - delayed to run AFTER scroll
        setTimeout(() => {
            inputRef.current?.focus();
        }, 300);
    };

    // Auto-scroll to bottom when opening or new messages
    useEffect(() => {
        if (visible && messages.length > 0) {
            // Immediate scroll without animation for snappy feel on open
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: false });
            }, 100);

            // Second scroll just in case layout wasn't ready
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 300);
        }
    }, [visible]);

    // Scroll when new messages come in
    useEffect(() => {
        if (visible && messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length, visible]);

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
                {/* Messages */}
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                    renderItem={({ item }) => (
                        <MessageRow
                            item={item}
                            myPlayerId={myPlayerId || ''}
                            onReply={setReplyTo}
                        />
                    )}
                />

                {/* Input */}
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
                >
                    {/* Reply Context Banner */}
                    {replyTo && (
                        <View style={styles.replyContext}>
                            <View style={styles.replyLine} />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.replyContextName}>Replying to {replyTo.name}</Text>
                                <Text style={styles.replyContextContent} numberOfLines={1}>{replyTo.content}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setReplyTo(null)} style={{ padding: 4 }}>
                                <Ionicons name="close" size={20} color={Colors.grayLight} />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Typing Indicator */}
                    {typingPlayers.length > 0 && (
                        <View style={styles.typingContainer}>
                            <Text style={styles.typingText}>
                                {typingPlayers.join(', ')} {typingPlayers.length > 1 ? 'are' : 'is'} typing...
                            </Text>
                        </View>
                    )}

                    <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                        <TextInput
                            ref={inputRef}
                            style={styles.input}
                            placeholderTextColor={Colors.grayLight}
                            value={inputText}
                            onChangeText={handleTextChange}
                            multiline
                            blurOnSubmit={false} // KEYBOARD FIX: Keeps keyboard open on submit
                            autoFocus={false}
                        />
                        <TouchableOpacity
                            onPress={handleSend}
                            style={styles.sendBtn}
                            disabled={!inputText.trim()}
                            {...(Platform.OS === 'web' ? { onMouseDown: (e: any) => e.preventDefault() } : {})}
                        >
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

interface MessageItem {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    replyToId?: string;
    replyToName?: string;
    replyToContent?: string;
}

const MessageRow = React.memo(({ item, myPlayerId, onReply }: { item: MessageItem, myPlayerId: string, onReply: (r: any) => void }) => {
    const swipeableRef = useRef<Swipeable>(null);
    const isMe = item.senderId === myPlayerId;

    const renderReplyAction = () => {
        return (
            <View style={{ justifyContent: 'center', alignItems: 'center', width: 50 }}>
                <Ionicons name="arrow-undo" size={24} color={Colors.grayLight} />
            </View>
        );
    };

    return (
        <Swipeable
            ref={swipeableRef}
            friction={1.5}
            overshootRight={false} // Prevent overshooting
            renderLeftActions={renderReplyAction}
            onSwipeableOpen={() => {
                onReply({ id: item.id, name: item.senderName, content: item.content });
                // Add delay to ensure animation plays smoothly before closing
                setTimeout(() => {
                    swipeableRef.current?.close();
                }, 400); // 400ms is a safe visual delay
            }}
        >
            <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow]}>
                <Text style={[styles.senderName, isMe && { marginRight: 4, alignSelf: 'flex-end', color: Colors.gaslightAmber }]}>
                    {item.senderName} {isMe ? '(You)' : ''}
                </Text>
                <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                    {/* Reply Preview Inside Message */}
                    {item.replyToId && (
                        <View style={[styles.replyQuote, isMe ? styles.myReplyQuote : styles.otherReplyQuote]}>
                            <Text style={[styles.replyName, isMe ? { color: Colors.parchment } : { color: Colors.grayLight }]}>{item.replyToName}</Text>
                            <Text style={[styles.replyContent, isMe ? { color: 'rgba(255,255,255,0.7)' } : { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={1}>
                                {item.replyToContent}
                            </Text>
                        </View>
                    )}
                    <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
                        {item.content}
                    </Text>
                </View>
            </View>
        </Swipeable>
    );
});

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
        alignItems: 'flex-end', // Align send button to bottom
        padding: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1A1A1A',
        gap: 12,
    },
    input: {
        flex: 1,
        minHeight: 48,
        maxHeight: 120, // Limit expansion
        backgroundColor: '#333',
        borderRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: Platform.OS === 'web' ? 0 : 14,
        lineHeight: 20, // Explicit line height for consistency
        textAlignVertical: 'center', // Android vertical center
        color: '#FFF',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#444',
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                boxShadow: 'none',
                resize: 'none', // Prevent manual resizing
                // Padding is handled by shared styles now
            } as any
        })
    },
    sendBtn: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.parchment,
        marginBottom: 0, // Align with bottom
    },
    typingContainer: {
        paddingHorizontal: 20,
        paddingBottom: 8,
    },
    typingText: {
        color: Colors.grayLight,
        fontSize: 12,
        fontStyle: 'italic',
    },
    replyContext: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 8,
        paddingTop: 8,
        backgroundColor: '#1A1A1A',
        borderTopWidth: 1,
        borderTopColor: '#333',
        gap: 12
    },
    replyLine: {
        width: 2,
        height: '100%',
        backgroundColor: Colors.parchment,
        borderRadius: 1
    },
    replyContextName: {
        color: Colors.parchment,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 2
    },
    replyContextContent: {
        color: Colors.grayLight,
        fontSize: 12
    },
    replyQuote: {
        marginBottom: 6,
        padding: 8,
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 8,
        borderLeftWidth: 2,
        borderLeftColor: Colors.parchment
    },
    myReplyQuote: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderLeftColor: Colors.parchment
    },
    otherReplyQuote: {
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderLeftColor: Colors.gaslightAmber
    },
    replyName: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2
    },
    replyContent: {
        fontSize: 12
    }
});
