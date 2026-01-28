import { GameAPI } from '@/api/game';
import { Colors } from '@/constants/colors';
import { getRandomWords } from '@/data/pictionary-words';
import { supabase } from '@/lib/supabase';
import { useOnlineGameStore } from '@/store/onlineGameStore';
import { haptics } from '@/utils/haptics';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CanvasView } from './CanvasView';

export function PictionaryView() {
    const insets = useSafeAreaInsets();
    const {
        roomCode,
        players,
        myPlayerId,
        isHost,
        gamePhase,
        selection,
        broadcastSelection,
        gameData // Persistent data from 'rooms' table
    } = useOnlineGameStore();

    // Derived State
    const myPlayer = players.find(p => p.id === myPlayerId);
    const drawer = players.find(p => p.role === 'drawer');
    // Enhanced isDrawer check to handle race conditions where DB role update lags behind broadcast
    const isDrawer = myPlayer?.role === 'drawer' || (gamePhase === 'PICTIONARY:SELECT_WORD' && selection?.type === 'PICTIONARY_OPTIONS' && selection?.id === myPlayerId);

    // Local State
    const [displayRound, setDisplayRound] = useState(1);
    const [timeLeft, setTimeLeft] = useState(60);
    const [selectionTimeLeft, setSelectionTimeLeft] = useState(15); // Auto-select timer
    const [currentPath, setCurrentPath] = useState<any>(null); // For broadcasting
    const [remotePaths, setRemotePaths] = useState<any[]>([]);
    const [wordOptions, setWordOptions] = useState<string[]>([]);
    const [guess, setGuess] = useState('');
    const [lastDrwanPathId, setLastDrawnPathId] = useState<string | null>(null);

    // Host State (Refs to persist across renders)
    const roundRef = useRef(1);
    const turnIndexRef = useRef(0); // Index in players array

    // --- EFFECT: Sync Persistent Game Data (Recover State on Reload) ---
    useEffect(() => {
        if (gameData?.type === 'pictionary' && gameData.data.round) {
            // Restore Round
            if (gameData.data.round !== roundRef.current) {
                console.log('Restoring Round directly from DB:', gameData.data.round);
                roundRef.current = gameData.data.round;
                setDisplayRound(gameData.data.round);
            }

            // Restore Turn Index (find index of stored drawerId)
            if (gameData.data.drawerId) {
                // Same sort order as nextTurn
                const sorted = [...players].sort((a, b) => a.created_at?.localeCompare(b.created_at || '') || 0);
                const idx = sorted.findIndex(p => p.id === gameData.data.drawerId);
                if (idx !== -1) {
                    turnIndexRef.current = idx;
                }
            }
        }
    }, [gameData, players]); // Sync whenever DB updates or players load

    // --- EFFECT: Host Game Loop (Logic Only) ---
    useEffect(() => {
        if (!isHost || !roomCode) return;

        // Phase Transitions & Host Logic
        if (gamePhase === 'PICTIONARY:SELECT_WORD') {
            if (!selection || selection.type !== 'PICTIONARY_OPTIONS') {
                const words = getRandomWords(3);
                console.log('Safety Check Triggered: Broadcasting Options');
                broadcastSelection({
                    type: 'PICTIONARY_OPTIONS',
                    id: drawer?.id || 'unknown',
                    data: {
                        options: words,
                        round: roundRef.current,
                        turnIndex: turnIndexRef.current
                    }
                });
            }

            // Host handles auto-select when time runs out
            if (selectionTimeLeft === 0) {
                const options = wordOptions.length > 0 ? wordOptions : getRandomWords(1);
                handleSelectWord(options[0]);
            }
        }

        if (gamePhase === 'PICTIONARY:DRAWING') {
            // Check if everyone guessed
            const activeGuessers = players.filter(p => p.role === 'guesser');
            const allGuessed = activeGuessers.length > 0 && activeGuessers.every(p => p.vote === 'CORRECT');

            if ((timeLeft === 0 || allGuessed) && activeGuessers.length > 0) {
                handleTurnEnd();
            }
        }
    }, [isHost, gamePhase, players, roomCode, timeLeft, selectionTimeLeft]);

    // --- EFFECT: Universal Timer Countdown ---
    useEffect(() => {
        let timer: any;

        if (gamePhase === 'PICTIONARY:SELECT_WORD') {
            timer = setInterval(() => {
                setSelectionTimeLeft(prev => prev > 0 ? prev - 1 : 0);
            }, 1000);
        } else if (gamePhase === 'PICTIONARY:DRAWING') {
            timer = setInterval(() => {
                setTimeLeft(prev => prev > 0 ? prev - 1 : 0);
            }, 1000);
        } else {
            // Reset timers when not in active phases?
            // Actually reset is handled by event listeners usually
        }

        return () => clearInterval(timer);
    }, [gamePhase]);

    // Sync state from selection
    useEffect(() => {
        if (selection?.type === 'PICTIONARY_OPTIONS') {
            setWordOptions(selection.data.options || []);
            // Sync round number visually
            if (selection.data.round) {
                roundRef.current = selection.data.round;
                setDisplayRound(selection.data.round);
            }
            if (selection.data.turnIndex !== undefined) {
                turnIndexRef.current = selection.data.turnIndex;
            }
            // Reset selection timer visually if needed (though local state handles it)
            setSelectionTimeLeft(15);
        }
        if (selection?.type === 'PICTIONARY_TIMER') {
            setTimeLeft(selection.data.time);
        }
    }, [selection]);

    // Handle Selection (Drawer only)
    const handleSelectWord = async (word: string) => {
        // Allow calling even if not drawer if forced by Host timeout
        // But normally checks role. Host timeout acts as "God Mode".
        if (!roomCode) return;

        // If triggered by Host Timeout, we might not be the drawer.
        // If Host is forcing selection:
        if (isHost && gamePhase === 'PICTIONARY:SELECT_WORD' && selectionTimeLeft <= 1) {
            // Host forces update
            // We need to update the drawer's secret word in DB?
            // Or just proceed.
            // Best to just force the phase and start.
            GameAPI.updateGamePhase(roomCode, 'PICTIONARY:DRAWING');
            broadcastSelection({ type: 'PICTIONARY_WORD_SELECTED', id: drawer?.id || null, data: { wordLength: word.length } });
            broadcastSelection({ type: 'PICTIONARY_TIMER', id: null, data: { time: 60 } });

            // Also try to update DB so the hint works
            // But we don't know who the drawer is easily without query, assume 'drawer' role.
            // We'll update for ALL players with role 'drawer' (should be 1).
            supabase.from('players').update({ secret_word: word }).eq('role', 'drawer').eq('room_code', roomCode).then();
            return;
        }

        if (!isDrawer) return;

        // 1. Set word in DB (hidden)
        const { error } = await supabase
            .from('players')
            .update({ secret_word: word }) // RLS hides this? Hopefully.
            .eq('id', myPlayerId);

        if (error) {
            console.error("Failed to select word", error);
            // Continue anyway to not block game
        }

        // ... rest of logic handled by effect or manually below


        // 2. Clear canvas paths
        setRemotePaths([]);
        setMyPaths([]);
        setRedoStack([]);

        // 3. Move Game Phase
        if (isHost) {
            GameAPI.updateGamePhase(roomCode, 'PICTIONARY:DRAWING');
            broadcastSelection({ type: 'PICTIONARY_TIMER', id: null, data: { time: 60 } });
        } else {
            // Request host to move phase? 
            // Currently only HOST can update game phase via API (RLS policies usually).
            // If Drawer is NOT host, they rely on Host observing the change?
            // Host needs to observe "secret_word" change? But Host might not see it if RLS hides it.
            // Workaround: Drawer sends broadcast "I picked a word".
            broadcastSelection({ type: 'PICTIONARY_WORD_SELECTED', id: myPlayerId, data: { wordLength: word.length } }); // Host sees this and moves phase.
        }
    };

    // Host listens for WORD_SELECTED
    useEffect(() => {
        if (isHost && selection?.type === 'PICTIONARY_WORD_SELECTED' && gamePhase === 'PICTIONARY:SELECT_WORD') {
            GameAPI.updateGamePhase(roomCode!, 'PICTIONARY:DRAWING');
            // Reset Timer
            setTimeLeft(60);
        }
    }, [isHost, selection, gamePhase]);


    const [remoteCurrentPaths, setRemoteCurrentPaths] = useState<Record<string, any>>({});
    const currentDrawPoints = useRef<any[]>([]);
    const lastBroadcast = useRef(0);

    // Hoisted State
    const [myPaths, setMyPaths] = useState<any[]>([]);
    const [redoStack, setRedoStack] = useState<any[]>([]);

    // Handle Drawing Broadcast (Completed & Progress)
    useEffect(() => {
        if (!roomCode) return;
        const channel = supabase.channel(`pictionary:${roomCode}`); // Dedicated channel for high-frequency drawing

        channel
            .on('broadcast', { event: 'draw' }, ({ payload }) => {
                if (payload.userId !== myPlayerId) {
                    setRemotePaths(prev => [...prev, payload.path]);
                    // Clear ghost path
                    setRemoteCurrentPaths(prev => {
                        const next = { ...prev };
                        delete next[payload.userId];
                        return next;
                    });
                }
            })
            .on('broadcast', { event: 'draw_progress' }, ({ payload }) => {
                if (payload.userId !== myPlayerId) {
                    setRemoteCurrentPaths(prev => ({
                        ...prev,
                        [payload.userId]: {
                            points: payload.points,
                            color: payload.color || 'white',
                            width: payload.width || 4,
                            tool: payload.tool || 'pen',
                            filled: payload.filled
                        }
                    }));
                }
            })
            .on('broadcast', { event: 'undo' }, ({ payload }) => {
                // Remove the last path added by this user (or by ID)
                if (payload.userId !== myPlayerId) {
                    setRemotePaths(prev => {
                        if (payload.pathId) {
                            return prev.filter(p => p.id !== payload.pathId);
                        }
                        return prev.slice(0, -1); // Fallback
                    });
                }
            })
            .on('broadcast', { event: 'modify_path' }, ({ payload }) => {
                // Update a path (e.g. fill)
                if (payload.userId !== myPlayerId) {
                    setRemotePaths(prev => prev.map(p => p.id === payload.pathId ? { ...p, ...payload.updates } : p));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [roomCode, myPlayerId]);

    const handleDrawMove = (point: any) => {
        if (!roomCode || !isDrawer) return;

        currentDrawPoints.current.push(point);

        const now = Date.now();
        if (now - lastBroadcast.current > 100) { // Throttle
            lastBroadcast.current = now;
            supabase.channel(`pictionary:${roomCode}`).send({
                type: 'broadcast',
                event: 'draw_progress',
                payload: {
                    userId: myPlayerId,
                    points: currentDrawPoints.current,
                    color: selectedColor,
                    width: selectedTool === 'eraser' ? 20 : strokeWidth,
                    tool: selectedTool,
                    filled: false
                }
            });
        }
    };

    // Reset points on start
    const handleDrawStart = () => {
        currentDrawPoints.current = [];
    };

    const handleDrawEnd = (path: any) => {
        if (!isDrawer) return;

        // Add to my paths
        setMyPaths(prev => [...prev, path]);
        setRedoStack([]); // Clear redo on new action

        if (roomCode) {
            supabase.channel(`pictionary:${roomCode}`).send({
                type: 'broadcast',
                event: 'draw',
                payload: { userId: myPlayerId, path }
            });
        }
        currentDrawPoints.current = [];
    };

    const handleUndo = () => {
        if (myPaths.length === 0) return;
        const last = myPaths[myPaths.length - 1];
        setMyPaths(prev => prev.slice(0, -1));
        setRedoStack(prev => [...prev, last]);

        if (roomCode) {
            supabase.channel(`pictionary:${roomCode}`).send({
                type: 'broadcast',
                event: 'undo',
                payload: { userId: myPlayerId, pathId: last.id }
            });
        }
    };

    const handleRedo = () => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        setRedoStack(prev => prev.slice(0, -1));
        setMyPaths(prev => [...prev, next]);

        if (roomCode) {
            supabase.channel(`pictionary:${roomCode}`).send({
                type: 'broadcast',
                event: 'draw',
                payload: { userId: myPlayerId, path: next }
            });
        }
    };

    const handlePathModify = (pathId: string, updates: any) => {
        // Update local
        setMyPaths(prev => prev.map(p => p.id === pathId ? { ...p, ...updates } : p));

        // Broadcast
        if (roomCode) {
            supabase.channel(`pictionary:${roomCode}`).send({
                type: 'broadcast',
                event: 'modify_path',
                payload: { userId: myPlayerId, pathId, updates }
            });
        }
    };

    // --- HOST LOGIC: Turn Management ---

    // Calculate current round/drawer statelessly
    // We repurpose 'vote' column: 'DRAWN' = player has finished a turn in this round.
    // 'CORRECT' = player guessed correctly.
    // At start of turn, Drawer = 'WAITING' (secret_word) or 'DRAWING'

    // We need a robust "Next Turn" handler
    const nextTurn = async () => {
        if (!isHost || !roomCode) return;

        // 1. Mark current drawer as 'DRAWN' (using vote column as metadata is risky if we use it for guessing)
        // Wait, we use 'vote' for Guess Status ('CORRECT').
        // We need another way to track "Who has drawn this round".
        // We can't change schema.
        // We can check the `selection` history? No.

        // Alternative: Use a deterministic order based on Player List
        // Round 1: Players [0] -> [1] -> [2]
        // Round 2: Players [0] -> [1] -> [2]

        // We need to store "Current Round" and "Current Drawer Index" in a persistent way.
        // We can put it in the room's `game_mode` column? "pictionary:r1:px"
        // Or cleaner: Use `selection` broadcast to sync it, but assume if we are moving turns, we just increment.
        // BUT if View unmounts, Refs die.
        // Fix: Use `useRef` but sync it with `selection` IF available.
        // AND when we broadcast the NEW selection (start of turn), we INCLUDE the current indexes.
        // AND we save it to `rooms` table if possible? No.

        // BEST EFFORT: 
        // 1. Get current turn/round from Refs (which should survive if component stays mounted).
        // 2. Increment.
        // 3. Broadcast new state so other clients (and Host self if reloaded) know.

        let nextIndex = turnIndexRef.current + 1;
        let nextRound = roundRef.current;

        if (nextIndex >= players.length) {
            nextIndex = 0;
            nextRound++;
            roundRef.current = nextRound;
        }
        turnIndexRef.current = nextIndex;

        // Check Game End: 3 Rounds Total
        if (nextRound > 3) {
            await GameAPI.updateGameStatus(roomCode, 'FINISHED');
            await GameAPI.updateGamePhase(roomCode, 'results');
            return;
        }

        // Setup Next Drawer
        // Sort players deterministically (by join time/created_at)
        const sortedPlayers = [...players].sort((a, b) => a.created_at?.localeCompare(b.created_at || '') || 0);
        const nextDrawer = sortedPlayers[nextIndex];

        if (!nextDrawer) {
            // Failsafe
            console.error("No next drawer found!");
            return;
        }

        // PERSIST STATE (Critical for Reloads)
        await GameAPI.updateGameData(roomCode, {
            round: nextRound,
            drawerId: nextDrawer.id,
            wordOptions: [], // will assume reset
            word: null
        });

        // Reset All Players for new turn
        // Set new drawer
        const otherIds = players.filter(p => p.id !== nextDrawer.id).map(p => p.id);

        const updates = [];
        updates.push(supabase.from('players').update({ role: 'drawer', secret_word: 'WAITING', vote: null }).eq('id', nextDrawer.id));
        if (otherIds.length > 0) {
            updates.push(supabase.from('players').update({ role: 'guesser', secret_word: '', vote: null }).in('id', otherIds));
        }
        await Promise.all(updates);

        // Broadcast State (Round info + Options)
        const words = getRandomWords(3);

        await broadcastSelection({
            type: 'PICTIONARY_OPTIONS',
            id: nextDrawer.id,
            data: {
                options: words,
                round: nextRound,
                turnIndex: nextIndex
            }
        });

        await GameAPI.updateGamePhase(roomCode, 'PICTIONARY:SELECT_WORD');
    };

    // Host Logic: Turn End
    const handleTurnEnd = async () => {
        if (!isHost || !roomCode) return;

        // 1. Move to Turn End Phase (Show results)
        await GameAPI.updateGamePhase(roomCode, 'PICTIONARY:TURN_END');

        // 2. Wait 5s then Next Turn
        setTimeout(async () => {
            await nextTurn();
        }, 5000);
    };

    // Feedback Logic
    const [feedback, setFeedback] = useState<{ visible: boolean, type: 'CORRECT' | 'CLOSE' | 'WRONG' }>({ visible: false, type: 'WRONG' });

    // Handle Guess Response & Feedback
    const submitGuess = async () => {
        if (!guess.trim()) return;
        if (myPlayer?.vote === 'CORRECT') return;

        try {
            const res = await GameAPI.verifyPictionaryGuess(roomCode!, myPlayerId!, guess, timeLeft);

            if (res.status === 'CORRECT') {
                haptics.success();
                setGuess('');
                setFeedback({ visible: true, type: 'CORRECT' });
                setTimeout(() => setFeedback({ visible: false, type: 'CORRECT' }), 2000);
            } else if (res.status === 'CLOSE') {
                // Show "Close!" toast/text
                haptics.warning();
                setFeedback({ visible: true, type: 'CLOSE' });
                setTimeout(() => setFeedback({ visible: false, type: 'CLOSE' }), 2000);
            } else {
                haptics.error();
                // Shake?
                setFeedback({ visible: true, type: 'WRONG' });
                setTimeout(() => setFeedback({ visible: false, type: 'WRONG' }), 2000);
            }
        } catch (e) {
            console.error(e);
            setFeedback({ visible: true, type: 'WRONG' });
            setTimeout(() => setFeedback({ visible: false, type: 'WRONG' }), 2000);
        }
        setGuess('');
    };

    // Turn End Reason
    // We can infer why turn ended: Time 0? Or everyone guessed?
    const turnEndReason = timeLeft === 0 ? "Time's Up!" : (players.filter(p => p.role === 'guesser').every(p => p.vote === 'CORRECT') ? "Everyone Guessed!" : "Round Over");

    // State for Drawing Tools
    const [selectedColor, setSelectedColor] = useState('#FFFFFF');
    const [selectedTool, setSelectedTool] = useState<'pen' | 'eraser' | 'rect' | 'circle' | 'fill'>('pen');
    const [strokeWidth, setStrokeWidth] = useState(4);

    const COLORS = [
        '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#00FFFF', '#FF00FF',
        '#C0C0C0', '#808080', '#800000', '#808000', '#008000', '#800080', '#008080', '#000080'
    ];

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={insets.top + 20}
        >
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.roundBadge}>
                    <Text style={styles.roundText}>ROUND {displayRound} / 3</Text>
                </View>
                {gamePhase === 'PICTIONARY:DRAWING' && (
                    <View style={styles.timerBadge}>
                        <Ionicons name="time" size={16} color={Colors.victorianBlack} />
                        <Text style={styles.timerText}>{timeLeft}s</Text>
                    </View>
                )}
            </View>

            {/* Main Content */}
            <View style={styles.content}>

                {/* SELECT WORD PHASE */}
                {gamePhase === 'PICTIONARY:SELECT_WORD' && (
                    <Animated.View entering={FadeIn} style={styles.centerContainer}>
                        {isDrawer ? (
                            <View style={styles.selectionBox}>
                                <Text style={styles.instructionTitle}>Pick a Word!</Text>
                                <Text style={{ color: Colors.grayLight, marginBottom: 10 }}>{selectionTimeLeft}s</Text>
                                <View style={styles.wordGrid}>
                                    {wordOptions.map((word, i) => (
                                        <TouchableOpacity
                                            key={i}
                                            style={styles.wordBtn}
                                            onPress={() => handleSelectWord(word)}
                                        >
                                            <Text style={styles.wordBtnText}>{word}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <View style={styles.waitingBox}>
                                <Text style={styles.waitingText}>{drawer?.name} is picking a word...</Text>
                            </View>
                        )}
                    </Animated.View>
                )}

                {/* DRAWING PHASE */}
                {(gamePhase === 'PICTIONARY:DRAWING' || gamePhase === 'PICTIONARY:TURN_END') && (
                    <View style={{ flex: 1, width: '100%', gap: 10 }}>
                        {/* Word Hint for Drawer */}
                        {isDrawer && (
                            <Text style={styles.drawerWord}>
                                Draw: <Text style={{ color: Colors.detective }}>{myPlayer?.secretWord}</Text>
                            </Text>
                        )}
                        {!isDrawer && (
                            <Text style={styles.drawerWord}>
                                Guess the word! ({selection?.data?.wordLength || '?'} letters)
                            </Text>
                        )}

                        <View style={{ width: '100%', aspectRatio: 1, maxHeight: '60%', alignSelf: 'center' }}>
                            <CanvasView
                                isDrawer={isDrawer && gamePhase === 'PICTIONARY:DRAWING'}
                                onDrawStart={handleDrawStart}
                                onDrawMove={handleDrawMove}
                                onDrawEnd={handleDrawEnd}
                                paths={isDrawer ? myPaths : remotePaths}
                                externalPaths={[]} // Deprecated
                                currentExternalPaths={remoteCurrentPaths}
                                color={selectedColor}
                                strokeWidth={strokeWidth}
                                tool={selectedTool}
                                backgroundColor="#1A1A1A"
                                onModifyPath={handlePathModify}
                            />
                        </View>

                        {/* Guess Input for Non-Drawers */}
                        {!isDrawer && gamePhase === 'PICTIONARY:DRAWING' && myPlayer?.vote !== 'CORRECT' && (
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Type your guess..."
                                    placeholderTextColor="#666"
                                    value={guess}
                                    onChangeText={setGuess}
                                    onSubmitEditing={submitGuess}
                                    returnKeyType="send"
                                />
                                <TouchableOpacity onPress={submitGuess} style={styles.sendBtn}>
                                    <Ionicons name="arrow-up" size={20} color="black" />
                                </TouchableOpacity>
                            </View>
                        )}
                        {!isDrawer && myPlayer?.vote === 'CORRECT' && (
                            <View style={styles.correctBadge}>
                                <Ionicons name="checkmark-circle" size={24} color={Colors.detective} />
                                <Text style={styles.correctText}>YOU GUESSED IT!</Text>
                            </View>
                        )}

                        {/* Drawer Footer (Toolbar) */}
                        {isDrawer && gamePhase === 'PICTIONARY:DRAWING' && (
                            <View style={styles.drawerToolbar}>
                                {/* Colors */}
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
                                    {COLORS.map(c => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[
                                                styles.colorDot,
                                                { backgroundColor: c, borderWidth: selectedColor === c ? 2 : 0, borderColor: 'white' }
                                            ]}
                                            onPress={() => {
                                                setSelectedColor(c);
                                                if (selectedTool === 'eraser') setSelectedTool('pen');
                                            }}
                                        />
                                    ))}
                                </ScrollView>

                                {/* Tools */}
                                <View style={styles.toolRow}>
                                    <TouchableOpacity
                                        style={[styles.toolBtn, selectedTool === 'pen' && styles.toolBtnActive]}
                                        onPress={() => setSelectedTool('pen')}
                                    >
                                        <Ionicons name="pencil" size={20} color={selectedTool === 'pen' ? 'black' : 'white'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toolBtn, selectedTool === 'eraser' && styles.toolBtnActive]}
                                        onPress={() => setSelectedTool('eraser')}
                                    >
                                        <MaterialCommunityIcons name="eraser" size={20} color={selectedTool === 'eraser' ? 'black' : 'white'} />
                                    </TouchableOpacity>
                                    <View style={{ width: 1, height: 20, backgroundColor: '#444', marginHorizontal: 5 }} />
                                    <TouchableOpacity
                                        style={[styles.toolBtn, { opacity: myPaths.length > 0 ? 1 : 0.5 }]}
                                        onPress={handleUndo}
                                        disabled={myPaths.length === 0}
                                    >
                                        <Ionicons name="arrow-undo" size={20} color="white" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toolBtn, { opacity: redoStack.length > 0 ? 1 : 0.5 }]}
                                        onPress={handleRedo}
                                        disabled={redoStack.length === 0}
                                    >
                                        <Ionicons name="arrow-redo" size={20} color="white" />
                                    </TouchableOpacity>
                                    <View style={{ width: 1, height: 20, backgroundColor: '#444', marginHorizontal: 5 }} />
                                    <TouchableOpacity
                                        style={[styles.toolBtn, selectedTool === 'rect' && styles.toolBtnActive]}
                                        onPress={() => setSelectedTool('rect')}
                                    >
                                        <Ionicons name="square-outline" size={20} color={selectedTool === 'rect' ? 'black' : 'white'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toolBtn, selectedTool === 'circle' && styles.toolBtnActive]}
                                        onPress={() => setSelectedTool('circle')}
                                    >
                                        <Ionicons name="ellipse-outline" size={20} color={selectedTool === 'circle' ? 'black' : 'white'} />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toolBtn, selectedTool === 'fill' && styles.toolBtnActive]}
                                        onPress={() => setSelectedTool('fill')}
                                    >
                                        <Ionicons name="color-fill-outline" size={20} color={selectedTool === 'fill' ? 'black' : 'white'} />
                                    </TouchableOpacity>
                                </View>
                                {/* Brush Size Slider */}
                                {(selectedTool === 'pen' || selectedTool === 'eraser') && (
                                    <View style={styles.sliderContainer}>
                                        <MaterialCommunityIcons name="brush" size={12} color="#aaa" />
                                        <Slider
                                            style={{ flex: 1, height: 40 }}
                                            minimumValue={1}
                                            maximumValue={selectedTool === 'eraser' ? 50 : 20}
                                            step={1}
                                            value={strokeWidth}
                                            onValueChange={setStrokeWidth}
                                            minimumTrackTintColor={selectedColor}
                                            maximumTrackTintColor="#555"
                                            thumbTintColor="white"
                                        />
                                        <View style={{
                                            width: selectedTool === 'eraser' ? strokeWidth : strokeWidth,
                                            height: selectedTool === 'eraser' ? strokeWidth : strokeWidth,
                                            borderRadius: strokeWidth / 2,
                                            backgroundColor: selectedColor
                                        }} />
                                    </View>
                                )}
                            </View>
                        )}

                        {isDrawer && gamePhase !== 'PICTIONARY:DRAWING' && (
                            <View style={styles.drawerFooter}>
                                <View style={styles.toolBadge}>
                                    <Ionicons name="pencil" size={16} color={Colors.victorianBlack} />
                                    <Text style={styles.toolText}>Drawing...</Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* TURN END OVERLAY */}
                {gamePhase === 'PICTIONARY:TURN_END' && (
                    <Animated.View entering={ZoomIn} style={styles.overlay}>
                        <Text style={styles.overlayTitle}>{turnEndReason}</Text>
                        <Text style={styles.overlaySubtitle}>
                            The word was: <Text style={{ color: Colors.parchment }}>{drawer?.secretWord}</Text>
                        </Text>
                        <View style={{ marginTop: 20 }}>
                            <Text style={{ color: Colors.grayLight }}>Next drawer coming up...</Text>
                        </View>
                    </Animated.View>
                )}

                {/* FEEDBACK OVERLAY */}
                {feedback.visible && (
                    <Animated.View entering={FadeInDown.springify()} style={styles.feedbackToast}>
                        <Text style={[
                            styles.feedbackText,
                            { color: feedback.type === 'CORRECT' ? '#4CAF50' : '#FFC107' }
                        ]}>
                            {feedback.type === 'CORRECT' ? 'CORRECT!' : 'CLOSE!'}
                        </Text>
                    </Animated.View>
                )}

            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        alignItems: 'center',
        paddingBottom: 10
    },
    roundBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    roundText: {
        color: Colors.parchment,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.parchment,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    timerText: {
        fontWeight: '900',
        color: Colors.victorianBlack,
        fontVariant: ['tabular-nums']
    },
    content: {
        flex: 1,
        padding: 10 // Reduced from 20 to give canvas more space
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    selectionBox: {
        width: '100%',
        alignItems: 'center',
        gap: 20
    },
    instructionTitle: {
        fontSize: 24,
        color: Colors.parchment,
        fontWeight: 'bold'
    },
    wordGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 12
    },
    wordBtn: {
        backgroundColor: Colors.parchment,
        paddingVertical: 15,
        paddingHorizontal: 25,
        borderRadius: 12,
        minWidth: 100,
        alignItems: 'center'
    },
    wordBtnText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.victorianBlack
    },
    waitingBox: {
        alignItems: 'center',
        gap: 10
    },
    waitingText: {
        color: Colors.grayLight,
        fontSize: 18,
        fontStyle: 'italic'
    },
    drawerWord: {
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
        fontWeight: '600'
    },
    inputRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20 // lift up a bit
    },
    input: {
        flex: 1,
        backgroundColor: '#222',
        borderRadius: 25,
        paddingHorizontal: 20,
        color: 'white',
        borderWidth: 1,
        borderColor: '#444',
        height: 50,
        fontSize: 16 // Prevent auto-zoom on iOS
    },
    sendBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.parchment,
        alignItems: 'center',
        justifyContent: 'center'
    },
    correctBadge: {
        backgroundColor: 'rgba(34, 139, 34, 0.2)',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        borderWidth: 1,
        borderColor: Colors.detective,
        marginBottom: 20
    },
    correctText: {
        color: Colors.detective,
        fontWeight: 'bold',
        fontSize: 16
    },
    overlay: {
        position: 'absolute',
        top: 0, bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
        zIndex: 10
    },
    overlayTitle: {
        fontSize: 40,
        color: 'white',
        fontWeight: '900',
        textAlign: 'center'
    },
    overlaySubtitle: {
        fontSize: 20,
        color: Colors.grayLight,
        textAlign: 'center'
    },
    feedbackToast: {
        position: 'absolute',
        top: '20%',
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'white',
        zIndex: 100
    },
    feedbackText: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center'
    },
    drawerFooter: {
        height: 50,
        marginBottom: 20,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row'
    },
    drawerToolbar: {
        gap: 10,
        padding: 10,
        backgroundColor: '#111',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333'
    },
    colorScroll: {
        flexGrow: 0,
        marginBottom: 10
    },
    colorDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        marginRight: 10
    },
    toolRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    toolBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#222',
        alignItems: 'center',
        justifyContent: 'center'
    },
    toolBtnActive: {
        backgroundColor: Colors.parchment
    },
    sliderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        backgroundColor: '#222',
        borderRadius: 20,
        padding: 10,
        gap: 10
    },
    toolBadge: {
        backgroundColor: Colors.parchment,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center'
    },
    toolText: {
        fontWeight: 'bold',
        color: Colors.victorianBlack
    }
});
