import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { GestureHandlerRootView, State as GestureState, PanGestureHandler, State, Swipeable, TapGestureHandler } from 'react-native-gesture-handler';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ChatModalProps {
    visible: boolean;
    onClose: () => void;
}

export const ChatModal = ({ visible, onClose }: ChatModalProps) => {
    const insets = useSafeAreaInsets();
    const { messages, sendChatMessage, myPlayerId, setChatOpen, clearUnreadCount, typingPlayers, setTyping, reactToMessage, players } = useOnlineGameStore();
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

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
            setTyping(false);
        }

        if (Platform.OS !== 'web') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }

        await sendChatMessage(inputText.trim(), replyTo || undefined);
        setInputText('');
        setReplyTo(null);
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const handleReact = useCallback((msgId: string, reaction: string) => {
        reactToMessage(msgId, reaction);
    }, [reactToMessage]);

    // Auto-scroll logic
    useEffect(() => {
        if (visible) {
            clearUnreadCount();
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        }
    }, [visible]);

    useEffect(() => {
        if (visible && messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length, visible]);

    useEffect(() => {
        if (replyTo) {
            inputRef.current?.focus();
        }
    }, [replyTo]);

    const handleHeaderSwipe = ({ nativeEvent }: any) => {
        if (nativeEvent.translationY > 50 && nativeEvent.state === GestureState.END) {
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={[styles.container, { paddingTop: insets.top }]}>
                    {/* Header with Swipe Down */}
                    <PanGestureHandler onHandlerStateChange={handleHeaderSwipe}>
                        <View style={styles.header}>
                            <TouchableOpacity
                                onPress={onClose}
                                hitSlop={{ top: 20, bottom: 20, left: 20, right: 40 }} // Large hit area
                                style={{ padding: 4 }}
                            >
                                <Ionicons name="chevron-down" size={32} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.headerTitle}>Chat</Text>
                            <View style={{ width: 32 }} />
                        </View>
                    </PanGestureHandler>

                    {/* Status Dot? */}


                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        onContentSizeChange={() => {
                            if (visible) flatListRef.current?.scrollToEnd({ animated: true });
                        }}
                        renderItem={({ item, index }) => {
                            const prev = messages[index - 1];
                            const next = messages[index + 1];
                            const isSameSenderPrev = prev?.senderId === item.senderId;
                            const isSameSenderNext = next?.senderId === item.senderId;

                            // Time grouping (show time if > 5 mins diff) - optional, skipping for simplicity request "exactly like instagram message bubbles"

                            return (
                                <MessageRow
                                    item={item}
                                    myPlayerId={myPlayerId || ''}
                                    onReply={setReplyTo}
                                    isSameSenderPrev={isSameSenderPrev}
                                    isSameSenderNext={isSameSenderNext}
                                    onReact={handleReact}
                                    players={players}
                                />
                            );
                        }}
                        ListFooterComponent={
                            typingPlayers.length > 0 ? (
                                <Animated.View entering={FadeIn} style={styles.typingContainer}>
                                    <View style={styles.typingBubble}>
                                        <Text style={{ fontSize: 20, lineHeight: 28 }}>...</Text>
                                    </View>
                                    <Text style={styles.typingText}>
                                        {typingPlayers.join(', ')} {typingPlayers.length > 1 ? 'are' : 'is'} typing...
                                    </Text>
                                </Animated.View>
                            ) : <View style={{ height: 10 }} />
                        }
                    />

                    {/* Input */}
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        {replyTo && (
                            <View style={styles.replyContext}>
                                <View style={styles.replyBar} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.replyContextName}>Replying to {replyTo.name}</Text>
                                    <Text style={styles.replyContextContent} numberOfLines={1}>{replyTo.content}</Text>
                                </View>
                                <TouchableOpacity onPress={() => setReplyTo(null)} style={{ padding: 4 }}>
                                    <Ionicons name="close" size={20} color={Colors.grayLight} />
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 10) }]}>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    ref={inputRef}
                                    style={styles.input}
                                    placeholder="Message..."
                                    placeholderTextColor={Colors.gray}
                                    value={inputText}
                                    onChangeText={handleTextChange}
                                    multiline
                                    blurOnSubmit={false}
                                />
                            </View>
                            {inputText.trim().length > 0 && (
                                <TouchableOpacity onPress={handleSend} style={styles.sendTextBtn}>
                                    <Text style={styles.sendText}>Send</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </GestureHandlerRootView>
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
    reactions?: Record<string, string>;
}

const MessageRow = React.memo(({ item, myPlayerId, onReply, isSameSenderPrev, isSameSenderNext, onReact, players }:
    { item: MessageItem, myPlayerId: string, onReply: (r: any) => void, isSameSenderPrev: boolean, isSameSenderNext: boolean, onReact: (id: string, r: string) => void, players: any[] }) => {

    const swipeableRef = useRef<Swipeable>(null);
    const isMe = item.senderId === myPlayerId;

    const renderLeftActions = () => (
        <View style={{ justifyContent: 'center', width: 60, height: '100%' }}>
            <Ionicons name="arrow-undo-circle" size={32} color="#FFF" style={{ marginLeft: 10 }} />
        </View>
    );

    const onDoubleTap = (event: any) => {
        if (event.nativeEvent.state === State.ACTIVE) {
            onReact(item.id, '❤️');
        }
    };

    const handleReactionPress = () => {
        if (!item.reactions) return;

        // Group users by reaction
        const reactionGroups: Record<string, string[]> = {};
        Object.entries(item.reactions).forEach(([pid, emoji]) => {
            if (!reactionGroups[emoji]) reactionGroups[emoji] = [];
            const player = players.find(p => p.id === pid);
            reactionGroups[emoji].push(player ? player.name : 'Unknown');
        });

        const info = Object.entries(reactionGroups).map(([emoji, names]) =>
            `${emoji} ${names.join(', ')}`
        ).join('\n');

        alert(info); // Using simple alert for "seeing who reacted"
    };

    // Border Radius Logic: Instagram style
    const borderRadius = 22;
    const smallRadius = 4;

    const bubbleStyle: any = {
        borderRadius,
    };

    if (isMe) {
        if (isSameSenderNext) bubbleStyle.borderBottomRightRadius = smallRadius;
        if (isSameSenderPrev) bubbleStyle.borderTopRightRadius = smallRadius;
    } else {
        if (isSameSenderNext) bubbleStyle.borderBottomLeftRadius = smallRadius;
        if (isSameSenderPrev) bubbleStyle.borderTopLeftRadius = smallRadius;
    }

    // Spacing
    const marginBottom = isSameSenderNext ? 2 : 12;

    return (
        <Swipeable
            ref={swipeableRef}
            friction={1.2} // Smoother swipe
            overshootRight={false}
            renderLeftActions={renderLeftActions}
            onSwipeableOpen={() => {
                onReply({ id: item.id, name: item.senderName, content: item.content });
                swipeableRef.current?.close();
            }}
        >
            <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow, { marginBottom }]}>
                {/* Avatar for Other (Bottom of group) */}
                {!isMe && (
                    <View style={{ width: 30, marginRight: 8, justifyContent: 'flex-end' }}>
                        {!isSameSenderNext ? (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.senderName.charAt(0).toUpperCase()}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                <TapGestureHandler numberOfTaps={2} onHandlerStateChange={onDoubleTap}>
                    <View style={{ maxWidth: '75%' }}>
                        {/* Name (Top of group) for Other */}
                        {!isMe && !isSameSenderPrev && (
                            <Text style={styles.senderName}>{item.senderName}</Text>
                        )}

                        <View>
                            {isMe ? (
                                <LinearGradient
                                    colors={['#7F53AC', '#647DEE']} // Instagram-ish Gradient
                                    start={{ x: 0, y: 0.5 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.bubble, bubbleStyle]}
                                >
                                    <MessageContent item={item} isMe={isMe} />
                                </LinearGradient>
                            ) : (
                                <View style={[styles.bubble, styles.otherBubble, bubbleStyle]}>
                                    <MessageContent item={item} isMe={isMe} />
                                </View>
                            )}

                            {/* Reactions Pill */}
                            {item.reactions && Object.keys(item.reactions).length > 0 && (
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    onPress={handleReactionPress}
                                    style={[styles.reactionsContainer, isMe ? { left: -4 } : { right: -4 }]}
                                >
                                    {Object.values(item.reactions).slice(0, 3).map((r, i) => (
                                        <Text key={i} style={{ fontSize: 10 }}>{r}</Text>
                                    ))}
                                    {Object.keys(item.reactions).length > 3 && (
                                        <Text style={{ fontSize: 10, color: '#FFF' }}>+</Text>
                                    )}
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </TapGestureHandler>
            </View>
        </Swipeable>
    );
});

const MessageContent = ({ item, isMe }: { item: MessageItem, isMe: boolean }) => (
    <>
        {item.replyToId && (
            <View style={[styles.replyQuote, isMe ? styles.myReplyQuote : styles.otherReplyQuote]}>
                <Text style={[styles.replyName, { color: isMe ? 'rgba(255,255,255,0.9)' : Colors.victorianBlack }]}>
                    {item.replyToName}
                </Text>
                <Text style={styles.replyContent} numberOfLines={1}>
                    {item.replyToContent}
                </Text>
            </View>
        )}
        <Text style={[styles.msgText, isMe ? styles.myMsgText : styles.otherMsgText]}>
            {item.content}
        </Text>
    </>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 0.5, borderBottomColor: '#333'
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.parchment },
    listContent: { padding: 16 },

    messageRow: { flexDirection: 'row', width: '100%' },
    myRow: { justifyContent: 'flex-end' },
    otherRow: { justifyContent: 'flex-start' },

    bubble: {
        paddingHorizontal: 16, paddingVertical: 12, minWidth: 40
    },
    otherBubble: {
        backgroundColor: '#262626',
    },

    avatar: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: '#444', // Lighter background
        alignItems: 'center', justifyContent: 'center'
    },
    avatarText: { fontSize: 12, fontWeight: '700', color: '#FFF' }, // White text
    senderName: { fontSize: 11, color: Colors.grayLight, marginBottom: 4, marginLeft: 12 },

    msgText: { fontSize: 16, lineHeight: 22 },
    myMsgText: { color: '#FFF' },
    otherMsgText: { color: '#FFF' },

    // Reply styles
    replyQuote: {
        marginBottom: 8, padding: 8, borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.5)'
    },
    myReplyQuote: { backgroundColor: 'rgba(0,0,0,0.2)' },
    otherReplyQuote: { backgroundColor: 'rgba(255,255,255,0.1)', borderLeftColor: Colors.gray },
    replyName: { fontSize: 12, fontWeight: '700', marginBottom: 2 },
    replyContent: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },

    // Input Area
    inputArea: {
        flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 8,
        backgroundColor: Colors.victorianBlack,
    },
    inputContainer: {
        flex: 1, backgroundColor: '#262626', borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10, // Container drives the vertical spacing/centering
        minHeight: 44,
        flexDirection: 'row',
        // alignItems: 'center' // Removed to allow natural expansion
    },
    input: {
        flex: 1, color: '#FFF', fontSize: 16,
        maxHeight: 120,
        textAlignVertical: 'center', // Keep centered for single line feel, or 'top' if it jumps
        paddingTop: 0, paddingBottom: 0, // Reset padding
        ...Platform.select({
            web: {
                outlineStyle: 'none',
                boxShadow: 'none',
                resize: 'none',
            } as any
        })
    },
    sendTextBtn: { marginLeft: 16, marginBottom: 12 }, // ALign with text bottom
    sendText: { color: '#647DEE', fontWeight: '700', fontSize: 16 },

    // Typing
    typingContainer: { paddingLeft: 46, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
    typingBubble: {
        paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#262626', borderRadius: 16,
    },
    typingText: { color: Colors.gray, fontSize: 12 },

    // Reply Context
    replyContext: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A',
        padding: 12, gap: 12, borderTopWidth: 1, borderTopColor: '#333'
    },
    replyBar: { width: 3, height: '100%', backgroundColor: '#647DEE', borderRadius: 2 },
    replyContextName: { color: '#647DEE', fontWeight: '700', fontSize: 13, marginBottom: 2 },
    replyContextContent: { color: Colors.grayLight, fontSize: 13 },

    // Reactions
    reactionsContainer: {
        position: 'absolute', bottom: -8, // Adjusted position
        flexDirection: 'row',
        backgroundColor: '#333',
        paddingHorizontal: 6, paddingVertical: 2,
        borderRadius: 12,
        borderWidth: 2, borderColor: Colors.victorianBlack,
        gap: 2,
        shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3
    }
});
