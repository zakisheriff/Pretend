import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.container}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: styles.content,
            animation: 'default',
            gestureEnabled: false, // Disable back gesture - no going back in game
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="add-players" />
          <Stack.Screen name="select-theme" />
          <Stack.Screen name="game-settings" />
          <Stack.Screen name="role-reveal" />
          <Stack.Screen name="start-game" />
          <Stack.Screen name="discussion" />
          <Stack.Screen name="voting" />
          <Stack.Screen name="results" />
          <Stack.Screen name="how-to-play" options={{ presentation: 'modal' }} />
        </Stack>
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
