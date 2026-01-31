import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, Animated as RNAnimated, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';
import { GestureHandlerRootView, State as GestureState, PanGestureHandler, Swipeable } from 'react-native-gesture-handler';
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
    const { messages, sendChatMessage, myPlayerId, setChatOpen, clearUnreadCount, typingPlayers, setTyping, markMessageAsSeen, players } = useOnlineGameStore();
    const [inputText, setInputText] = React.useState('');
    const [inputHeight, setInputHeight] = useState(40);
    const [replyTo, setReplyTo] = useState<{ id: string, name: string, content: string } | null>(null);
    const [isInputFocused, setIsInputFocused] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    // Mark as seen logic
    useEffect(() => {
        if (visible && messages.length > 0 && myPlayerId) {
            messages.forEach(msg => {
                if (msg.senderId !== myPlayerId) {
                    const seenBy = msg.seenBy || [];
                    if (!seenBy.includes(myPlayerId)) {
                        markMessageAsSeen(msg.id);
                    }
                }
            });
        }
    }, [visible, messages.length, myPlayerId]);

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
        const textToSend = inputText.trim();
        if (!textToSend) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
            setTyping(false);
        }

        if (Platform.OS !== 'web') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        }

        // Optimistic clear
        setInputText('');
        setReplyTo(null);

        await sendChatMessage(textToSend, replyTo || undefined);

        // Scroll to end but DON'T auto-scroll if user is typing (handled by isInputFocused check)
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        // Re-focus input AFTER all operations to ensure keyboard stays open
        setTimeout(() => {
            if (Platform.OS === 'web') {
                if (inputRef.current) (inputRef.current as any).focus();
            } else {
                inputRef.current?.focus();
            }
        }, 150);
    };



    // Auto-scroll logic
    useEffect(() => {
        if (visible) {
            clearUnreadCount();
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
        }
    }, [visible]);

    useEffect(() => {
        // Only auto-scroll if the user is NOT actively typing
        if (visible && messages.length > 0 && !isInputFocused) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages.length, visible]);

    useEffect(() => {
        if (replyTo) {
            // Instant focus for a snappy feel
            const focus = () => {
                if (Platform.OS === 'web') {
                    if (inputRef.current) (inputRef.current as any).focus();
                } else {
                    inputRef.current?.focus();
                }
            };

            // Minimal delay to ensure the reply context renders
            requestAnimationFrame(focus);
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

                    {/* Messages */}
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        keyboardDismissMode="none"
                        keyboardShouldPersistTaps="handled"
                        onTouchStart={() => {
                            // Optional: Dismiss on touch if preferred, but on-drag is standard for chat
                            // If user wants "touch anywhere", onTouchStart on list might work but interferes with scrolling?
                            // Standard "WhatsApp-like" behavior is dismiss on drag or tap on empty space.
                        }}
                        onContentSizeChange={() => {
                            // Only auto-scroll if not actively typing
                            if (visible && !isInputFocused) flatListRef.current?.scrollToEnd({ animated: true });
                        }}
                        renderItem={({ item, index }) => {
                            const prev = messages[index - 1];
                            const next = messages[index + 1];
                            const isSameSenderPrev = prev?.senderId === item.senderId;
                            const isSameSenderNext = next?.senderId === item.senderId;

                            return (
                                <MessageRow
                                    item={item}
                                    myPlayerId={myPlayerId || ''}
                                    onReply={setReplyTo}
                                    isSameSenderPrev={isSameSenderPrev}
                                    isSameSenderNext={isSameSenderNext}
                                    players={players}
                                />
                            );
                        }}
                        ListFooterComponent={
                            typingPlayers.length > 0 ? (
                                <Animated.View entering={FadeIn} style={styles.typingContainer}>
                                    <View style={styles.typingBubble}>
                                        <Text style={{ fontSize: 20, lineHeight: 28, color: '#FFF' }}>...</Text>
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
                                    style={[styles.input, Platform.OS === 'web' && { height: Math.max(24, Math.min(140, inputHeight)) }]}
                                    placeholder="Message..."
                                    placeholderTextColor={Colors.grayLight}
                                    value={inputText}
                                    onChangeText={handleTextChange}
                                    onFocus={() => setIsInputFocused(true)}
                                    onBlur={() => setIsInputFocused(false)}
                                    multiline
                                    blurOnSubmit={false}
                                />

                                {Platform.OS === 'web' && (
                                    <Text
                                        style={[
                                            styles.input,
                                            {
                                                position: 'absolute',
                                                opacity: 0,
                                                zIndex: -1,
                                                height: undefined,
                                                maxHeight: undefined,
                                                width: '100%',
                                                flex: undefined,
                                            }
                                        ]}
                                        onLayout={(e) => {
                                            if (Platform.OS === 'web') {
                                                setInputHeight(e.nativeEvent.layout.height);
                                            }
                                        }}
                                    >
                                        {inputText ? inputText + '\u200b' : 'Message...'}
                                    </Text>
                                )}

                                {inputText.trim().length > 0 && (
                                    <TouchableOpacity
                                        onPress={handleSend}
                                        style={{ justifyContent: 'center', alignSelf: 'flex-end', marginBottom: 12, marginLeft: 8 }}
                                        {...Platform.select({
                                            web: {
                                                onMouseDown: (e: any) => e.preventDefault(),
                                                // Prevent focus stealing on web click
                                            } as any
                                        })}
                                    >
                                        <Text style={styles.sendText}>Send</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
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
    seenBy?: string[];
}

const MessageRow = React.memo(({ item, myPlayerId, onReply, isSameSenderPrev, isSameSenderNext, players }:
    { item: MessageItem, myPlayerId: string, onReply: (r: any) => void, isSameSenderPrev: boolean, isSameSenderNext: boolean, players: any[] }) => {

    const swipeableRef = useRef<Swipeable>(null);
    const isMe = item.senderId === myPlayerId;

    // Filter out "myself" from seenBy list to get "others" count/names
    const seenByOthers = (item.seenBy || []).filter(id => id !== myPlayerId);
    const showSeen = isMe && seenByOthers.length > 0 && !isSameSenderNext;

    const renderRightActions = (progress: any, dragX: any) => {
        const scale = dragX.interpolate({
            inputRange: [-50, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        const opacity = dragX.interpolate({
            inputRange: [-30, 0],
            outputRange: [1, 0],
            extrapolate: 'clamp',
        });

        return (
            <View style={{ justifyContent: 'center', alignItems: 'flex-end', width: 60, height: '100%' }}>
                <RNAnimated.View style={{ transform: [{ scale }], opacity, marginRight: 15 }}>
                    <Ionicons name="arrow-undo-circle" size={32} color="#FFF" />
                </RNAnimated.View>
            </View>
        );
    };

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

    const marginBottom = isSameSenderNext ? 2 : 12;

    return (
        <Swipeable
            ref={swipeableRef}
            friction={1}
            overshootLeft={false}
            rightThreshold={30}
            renderRightActions={renderRightActions}
            onSwipeableOpen={() => {
                haptics.medium();
                onReply({ id: item.id, name: item.senderName, content: item.content });
                // Faster close for better performance
                setTimeout(() => swipeableRef.current?.close(), 200);
            }}
        >
            <View style={[styles.messageRow, isMe ? styles.myRow : styles.otherRow, { marginBottom }]}>
                {!isMe && (
                    <View style={{ width: 30, marginRight: 8, justifyContent: 'flex-end' }}>
                        {!isSameSenderNext ? (
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{item.senderName.charAt(0).toUpperCase()}</Text>
                            </View>
                        ) : null}
                    </View>
                )}

                <View style={{ maxWidth: '75%' }}>
                    {!isMe && !isSameSenderPrev && (
                        <Text style={styles.senderName}>{item.senderName}</Text>
                    )}

                    <View>
                        {isMe ? (
                            <LinearGradient
                                colors={['#7F53AC', '#647DEE']}
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

                        {showSeen && (
                            <Text style={styles.seenText}>Seen</Text>
                        )}
                    </View>
                </View>
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
    container: {
        flex: 1,
        backgroundColor: Colors.victorianBlack,
        ...Platform.select({
            web: {
                maxWidth: 600,
                width: '100%',
                alignSelf: 'center',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderColor: '#333',
            }
        })
    },
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
        width: 30, height: 30, borderRadius: 15, backgroundColor: '#444',
        alignItems: 'center', justifyContent: 'center'
    },
    avatarText: { fontSize: 12, fontWeight: '700', color: '#FFF' },
    senderName: { fontSize: 11, color: Colors.grayLight, marginBottom: 4, marginLeft: 12 },

    msgText: { fontSize: 16, lineHeight: 22 },
    myMsgText: { color: '#FFF' },
    otherMsgText: { color: '#FFF' },

    // Reply styles
    replyQuote: {
        marginBottom: 8, padding: 10, borderRadius: 16, // More curved
        backgroundColor: 'rgba(0,0,0,0.15)',
    },
    myReplyQuote: { backgroundColor: 'rgba(0,0,0,0.2)' },
    otherReplyQuote: { backgroundColor: 'rgba(255,255,255,0.1)' },
    replyName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    replyContent: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

    // Input Area
    inputArea: {
        paddingHorizontal: 16, paddingTop: 8,
        backgroundColor: Colors.victorianBlack,
    },
    inputContainer: {
        backgroundColor: '#262626', borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 2,
        minHeight: 44, // Minimal visual height
        flexDirection: 'row',
        alignItems: 'flex-end'
    },
    input: {
        flex: 1, color: '#FFF', fontSize: 17,
        maxHeight: 140,
        minHeight: 24,
        paddingTop: 10, paddingBottom: 10, // Center text via padding
        ...Platform.select({
            web: {
                flex: undefined, // Let height determine size
                width: '100%',
                outlineStyle: 'none',
                boxShadow: 'none',
                resize: 'none',
                paddingTop: 5,
                paddingBottom: 10,
                fontSize: 16,
            } as any
        })
    },
    sendText: { color: '#647DEE', fontWeight: '700', fontSize: 16 },

    // Typing
    typingContainer: { paddingLeft: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 8 },
    typingBubble: {
        paddingHorizontal: 12, paddingVertical: 4, backgroundColor: '#262626', borderRadius: 16,
    },
    typingText: { color: Colors.grayLight, fontSize: 12 },

    // Reply Context (Input Area)
    replyContext: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', // Matching input bg
        padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 16, // Curved Pill
        marginBottom: 4 // overlap slighlty or connect
    },
    replyContextName: { color: '#647DEE', fontWeight: '700', fontSize: 13, marginBottom: 2 },
    replyContextContent: { color: Colors.grayLight, fontSize: 13 },

    // Seen Status
    seenText: {
        fontSize: 10, color: 'rgba(255,255,255,0.6)',
        alignSelf: 'flex-end', marginTop: 2, marginRight: 2
    }

});
