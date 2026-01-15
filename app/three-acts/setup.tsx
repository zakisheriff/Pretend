import { BackButton } from '@/components/common/BackButton';
import { Button } from '@/components/game/Button';
import { Colors } from '@/constants/colors';
import { useGameStore } from '@/store/gameStore';
import { ThreeActsTeam } from '@/types/game';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ThreeActsSetup() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const players = useGameStore((s) => s.players);
    const startThreeActsGame = useGameStore((s) => s.startThreeActsGame);
    const startGame = useGameStore((s) => s.startGame); // Use standard start game to transition? No, use specific action.

    // State for team formation
    // We need to pair all players.
    // Initial state: all players are unassigned.
    const [teams, setTeams] = useState<ThreeActsTeam[]>([]);
    const [unassignedPlayerIds, setUnassignedPlayerIds] = useState<string[]>(players.map(p => p.id));

    // Auto-create teams if even number?
    // User wants manual selection.

    const handlePlayerPress = (playerId: string) => {
        // Find if player is already in a team
        const teamIndex = teams.findIndex(t => t.player1Id === playerId || t.player2Id === playerId);

        if (teamIndex !== -1) {
            // Remove from team
            const team = teams[teamIndex];
            const newTeams = [...teams];

            if (team.player1Id === playerId && !team.player2Id) {
                // Remove team entirely if only 1 player
                newTeams.splice(teamIndex, 1);
            } else if (team.player1Id === playerId) {
                // Move player 2 to player 1? Or just clear slot?
                // Let's just remove the team and put the other player back to unassigned? 
                // Easier: Remove player from team.
                if (team.player1Id === playerId) {
                    // Shift P2 to P1 or just leave hole?
                    // Better to just dissolve partial teams or allow holes.
                    // Let's keep it simple: Click a team member -> they become unassigned.
                    // If team becomes empty, remove team.
                    const otherPlayerId = team.player1Id === playerId ? team.player2Id : team.player1Id;
                    newTeams.splice(teamIndex, 1); // delete team
                    // Create new team with other player if exists
                    if (otherPlayerId) {
                        const newTeamId = Math.random().toString(36).substring(7);
                        newTeams.push({
                            id: newTeamId,
                            player1Id: otherPlayerId,
                            player2Id: '',
                            score: 0,
                            turnComplete: false,
                            roundStats: {
                                act1: { chosen: '', guessed: false, skipped: false, options: [] },
                                act2: { chosen: '', guessed: false, skipped: false, options: [] },
                                act3: { chosen: '', guessed: false, skipped: false, options: [] },
                            }
                        });
                    }
                }
            } else {
                // Removed player 2
                newTeams[teamIndex] = { ...team, player2Id: '' };
            }
            // For simplicity: If you tap a player in a team, they go back to unassigned.
            // If a team has 1 player left, they wait for a partner.
        } else {
            // Add to first available team slot or create new team
            // Check if any team has 1 player (and empty slot 2)
            const openTeamIndex = teams.findIndex(t => !t.player2Id);

            if (openTeamIndex !== -1) {
                const newTeams = [...teams];
                newTeams[openTeamIndex].player2Id = playerId;
                setTeams(newTeams);
            } else {
                // Create new team
                setTeams([...teams, {
                    id: Math.random().toString(36).substring(7),
                    player1Id: playerId,
                    player2Id: '',
                    score: 0,
                    turnComplete: false,
                    roundStats: {
                        act1: { chosen: '', guessed: false, skipped: false, options: [] },
                        act2: { chosen: '', guessed: false, skipped: false, options: [] },
                        act3: { chosen: '', guessed: false, skipped: false, options: [] },
                    }
                }]);
            }
            setUnassignedPlayerIds(prev => prev.filter(id => id !== playerId));
        }
    };

    // Actually, simpler logic:
    // Two lists: Unassigned, Teams.
    // Tap unassigned -> Selects them.
    // If 1 selected -> Highlight.
    // If 2 selected -> Form Team automatically?

    // Let's try:
    // Tap unassigned -> Moves to "Draft" spot.
    // When 2 in Draft -> Create Team.

    const [draftIds, setDraftIds] = useState<string[]>([]);

    const handleUnassignedPress = (id: string) => {
        if (draftIds.includes(id)) {
            setDraftIds(draftIds.filter(d => d !== id));
        } else {
            if (draftIds.length < 2) {
                const newDraft = [...draftIds, id];
                setDraftIds(newDraft);

                if (newDraft.length === 2) {
                    // Create team completely
                    setTimeout(() => {
                        createTeam(newDraft[0], newDraft[1]);
                    }, 300);
                }
            }
        }
    };

    const createTeam = (p1: string, p2: string) => {
        const newTeam: ThreeActsTeam = {
            id: Math.random().toString(36).substring(7),
            player1Id: p1,
            player2Id: p2,
            score: 0,
            turnComplete: false,
            roundStats: {
                act1: { chosen: '', guessed: false, skipped: false, options: [] },
                act2: { chosen: '', guessed: false, skipped: false, options: [] },
                act3: { chosen: '', guessed: false, skipped: false, options: [] },
            }
        };
        setTeams([...teams, newTeam]);
        setDraftIds([]);
        setUnassignedPlayerIds(prev => prev.filter(id => id !== p1 && id !== p2));
    };

    const breakTeam = (team: ThreeActsTeam) => {
        setTeams(teams.filter(t => t.id !== team.id));
        setUnassignedPlayerIds([...unassignedPlayerIds, team.player1Id, team.player2Id]);
    };

    const handleStart = () => {
        // Validate
        if (unassignedPlayerIds.length > 0) return; // Must assign all?
        if (teams.length < 2) return; // Minimum 2 teams (4 players)

        startThreeActsGame(teams);
        router.replace('/three-acts/game');
    };

    const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '?';

    return (
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            <View style={styles.header}>
                <BackButton />
                <Text style={styles.title}>Team Selection</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.instruction}>Select 2 players to form a team</Text>

                <View style={styles.unassignedArea}>
                    <Text style={styles.sectionLabel}>Available Players</Text>
                    <View style={styles.playerWrap}>
                        {unassignedPlayerIds.map((id) => {
                            const isSelected = draftIds.includes(id);
                            return (
                                <TouchableOpacity
                                    key={id}
                                    style={[styles.playerChip, isSelected && styles.playerChipSelected]}
                                    onPress={() => handleUnassignedPress(id)}
                                >
                                    <Text style={[styles.playerChipText, isSelected && styles.playerChipTextSelected]}>
                                        {getPlayerName(id)}
                                    </Text>
                                    {isSelected && <Ionicons name="checkmark" size={16} color={Colors.victorianBlack} />}
                                </TouchableOpacity>
                            );
                        })}
                        {unassignedPlayerIds.length === 0 && (
                            <Text style={styles.emptyText}>All assigned!</Text>
                        )}
                    </View>
                </View>

                <View style={styles.teamsList}>
                    <Text style={styles.sectionLabel}>Teams</Text>
                    {teams.map((team, index) => (
                        <Animated.View
                            key={team.id}
                            entering={FadeInDown.delay(index * 100)}
                            style={styles.teamCard}
                        >
                            <View style={styles.teamHeader}>
                                <Text style={styles.teamTitle}>Team {index + 1}</Text>
                                <TouchableOpacity onPress={() => breakTeam(team)}>
                                    <Ionicons name="close-circle-outline" size={20} color={Colors.danger} />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.teamMembers}>
                                <View style={styles.teamMember}>
                                    <Ionicons name="person" size={14} color={Colors.candlelight} />
                                    <Text style={styles.teamMemberName}>{getPlayerName(team.player1Id)}</Text>
                                </View>
                                <Ionicons name="link" size={16} color={Colors.grayMedium} />
                                <View style={styles.teamMember}>
                                    <Ionicons name="person" size={14} color={Colors.candlelight} />
                                    <Text style={styles.teamMemberName}>{getPlayerName(team.player2Id)}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    ))}
                    {teams.length === 0 && (
                        <Text style={styles.emptyText}>No teams formed yet. </Text>
                    )}
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title="Start Game"
                    onPress={handleStart}
                    variant="primary"
                    disabled={teams.length < 2 || unassignedPlayerIds.length > 0}
                    style={styles.startBtn}
                />
                <Text style={styles.footerNote}>
                    {unassignedPlayerIds.length > 0 ? 'Assign all players' : teams.length < 2 ? 'Need at least 2 teams' : 'Ready to start!'}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.victorianBlack },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    backBtn: { marginRight: 10, width: 40, height: 40, paddingHorizontal: 0 },
    title: { fontSize: 24, fontWeight: '800', color: Colors.parchment, letterSpacing: 1, marginLeft: 12 },
    content: { flex: 1 },
    scrollContent: { padding: 20, gap: 30 },
    instruction: { color: Colors.candlelight, fontStyle: 'italic', textAlign: 'center', opacity: 0.8 },

    sectionLabel: { color: Colors.parchment, fontSize: 18, fontWeight: '700', marginBottom: 12 },
    unassignedArea: {},
    playerWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    playerChip: {
        backgroundColor: Colors.grayDark,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    playerChipSelected: {
        backgroundColor: Colors.candlelight,
        borderColor: Colors.candlelight,
    },
    playerChipText: { color: Colors.parchment, fontWeight: '600' },
    playerChipTextSelected: { color: Colors.victorianBlack },

    teamsList: { gap: 12 },
    teamCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.grayMedium,
    },
    teamHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    teamTitle: { color: Colors.candlelight, fontWeight: '800', fontSize: 16 },
    teamMembers: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(0,0,0,0.2)', padding: 10, borderRadius: 12 },
    teamMember: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    teamMemberName: { color: Colors.parchment, fontWeight: '600', fontSize: 16 },

    emptyText: { color: Colors.grayLight, fontStyle: 'italic' },

    footer: { padding: 20, borderTopWidth: 1, borderTopColor: Colors.grayMedium, backgroundColor: Colors.victorianBlack },
    startBtn: { width: '100%' },
    footerNote: { color: Colors.gray, textAlign: 'center', marginTop: 10, fontSize: 12 },
});
