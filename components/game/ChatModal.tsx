import { Colors } from '@/constants/colors';
import { useOnlineGameStore } from '@/store/onlineGameStore';
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
    const [replyTo, setReplyTo] = useState<{ id: string, name: string, content: string } | null>(null);
    const flatListRef = useRef<FlatList>(null);
    const inputRef = useRef<TextInput>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);


    // Mark as seen logic
    useEffect(() => {
        if (visible && messages.length > 0 && myPlayerId) {
            // Find last message NOT validly seen by me
            // Actually simpler: iterate and mark any unseen messages as seen
            // To avoid spamming, maybe just check the last few?
            // Or simpler: Just mark the *last message* as seen if it wasn't sent by me.
            // If I see the last message, I implicitly saw the ones before.
            // But for accurate "seen by" lists on each message, we technically should update specific ones.
            // Let's stick to marking the *latest* relevant message for now or batching.
            // For this specific request: "check if users have seen the message"
            // Let's mark ALL unseen messages not sent by me as seen.

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
                            // Calculate z-index: Higher index items (rendered later) should be "below" earlier items to allow reactions to hang over
                            // wait, standard stacking: subsequent siblings cover previous ones.
                            // To make Item 0 cover Item 1, Item 0 needs higher zIndex.
                            const zIndex = messages.length - index;

                            // Time grouping (show time if > 5 mins diff) - optional, skipping for simplicity request "exactly like instagram message bubbles"


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
                                    style={styles.input}
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
    seenBy?: string[];
}

const MessageRow = React.memo(({ item, myPlayerId, onReply, isSameSenderPrev, isSameSenderNext, players }:
    { item: MessageItem, myPlayerId: string, onReply: (r: any) => void, isSameSenderPrev: boolean, isSameSenderNext: boolean, players: any[] }) => {

    const swipeableRef = useRef<Swipeable>(null);
    const isMe = item.senderId === myPlayerId;

    // Filter out "myself" from seenBy list to get "others" count/names
    // If I'm the sender, I want to know who else saw it.
    // If I'm NOT the sender, I don't really care who saw it usually, or maybe I do?
    // Usually "Seen" is for the sender.
    const seenByOthers = (item.seenBy || []).filter(id => id !== myPlayerId);
    const showSeen = isMe && seenByOthers.length > 0 && !isSameSenderNext; // Only show on last bubble of group? or all? Instagram shows on bottom most usually.
    // Let's show on the very last message of the sequence OR if it has a unique seen status?
    // Simpler: Show if 'seenByOthers' > 0.
    // Placement: Bottom right of bubble.

    const renderLeftActions = (progress: any, dragX: any) => {
        const scale = dragX.interpolate({
            inputRange: [0, 50],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });

        const opacity = dragX.interpolate({
            inputRange: [0, 30],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        });

        return (
            <View style={{ justifyContent: 'center', width: 60, height: '100%' }}>
                <RNAnimated.View style={{ transform: [{ scale }], opacity, marginLeft: 10 }}>
                    <Ionicons name="arrow-undo-circle" size={32} color="#FFF" />
                </RNAnimated.View>
            </View>
        );
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

                        {/* Seen Status */}
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
        marginBottom: 8, padding: 10, borderRadius: 16, // More curved
        backgroundColor: 'rgba(0,0,0,0.15)',
        // borderLeftWidth: 3, borderLeftColor: 'rgba(255,255,255,0.5)' // Removed
    },
    myReplyQuote: { backgroundColor: 'rgba(0,0,0,0.2)' },
    otherReplyQuote: { backgroundColor: 'rgba(255,255,255,0.1)' },
    replyName: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
    replyContent: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

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
        maxHeight: 220,
        textAlignVertical: 'top', // Allow growing from top
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
    typingText: { color: Colors.grayLight, fontSize: 12 },

    // Reply Context (Input Area)
    replyContext: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#262626', // Matching input bg
        padding: 12, marginHorizontal: 16, marginTop: 8, borderRadius: 16, // Curved Pill
        marginBottom: 4 // overlap slighlty or connect
    },
    // replyBar: { width: 3, height: '100%', backgroundColor: '#647DEE', borderRadius: 2 }, // Removed
    replyContextName: { color: '#647DEE', fontWeight: '700', fontSize: 13, marginBottom: 2 },
    replyContextContent: { color: Colors.grayLight, fontSize: 13 },



    // Seen Status
    seenText: {
        fontSize: 10, color: 'rgba(255,255,255,0.6)',
        alignSelf: 'flex-end', marginTop: 2, marginRight: 2
    }
});
