import { FloatingChat } from '@/components/game/FloatingChat';
import { useGameStore } from '@/store/gameStore';
import { Stack, usePathname, useRootNavigationState, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const rootNavigationState = useRootNavigationState();
  const hasPlayers = useGameStore((state) => state.players.length > 0);

  useEffect(() => {
    // Wait for navigation to be ready
    if (!rootNavigationState?.key) return;

    // List of routes that require active game state
    const protectedPaths = [
      '/game-settings',
      '/role-reveal',
      '/start-game',
      '/discussion',
      '/voting',
      '/results',
      '/police-arrest'
    ];

    const isProtectedRoute = protectedPaths.some(path => pathname === path || pathname.startsWith(path + '/'));

    if (isProtectedRoute && !hasPlayers) {
      setTimeout(() => {
        router.replace('/');
      }, 0);
    }
  }, [pathname, hasPlayers, rootNavigationState?.key]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: styles.content,
            animation: 'default',
            gestureEnabled: false,
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="add-players" />
          <Stack.Screen name="select-theme" />
          <Stack.Screen name="game-settings" />

          {/* Game Stages - No Back Gesture */}
          <Stack.Screen name="role-reveal" options={{ gestureEnabled: false }} />
          <Stack.Screen name="start-game" options={{ gestureEnabled: false }} />
          <Stack.Screen name="discussion" options={{ gestureEnabled: false }} />
          <Stack.Screen name="voting" options={{ gestureEnabled: false }} />
          <Stack.Screen name="results" options={{ gestureEnabled: false }} />
          <Stack.Screen name="police-arrest" options={{ gestureEnabled: false }} />
          <Stack.Screen name="director-verdict" options={{ gestureEnabled: false }} />
          <Stack.Screen name="verbal-vote" options={{ gestureEnabled: false }} />

          {/* Specific Game Modes */}
          <Stack.Screen name="wavelength/game" options={{ gestureEnabled: false }} />
          <Stack.Screen name="time-bomb/game" options={{ gestureEnabled: false }} />
          <Stack.Screen name="charades/game" options={{ gestureEnabled: false }} />
          <Stack.Screen name="three-acts/game" options={{ gestureEnabled: false }} />
          <Stack.Screen name="three-acts/setup" options={{ gestureEnabled: false }} />

          <Stack.Screen name="how-to-play" options={{ presentation: 'modal' }} />
        </Stack>
        <FloatingChat />
        <StatusBar style="light" />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    backgroundColor: '#000000',
  },
});
